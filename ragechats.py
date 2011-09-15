import collections
import json
import os
import random
import re
import redis
import string
import sys
import threading
import tornado.escape
import tornado.ioloop
import tornado.httpserver
import tornado.web
import tornado.websocket


# Globals
clients = collections.defaultdict(set)
redis_client = None
redis_pubsub = None


class PubSubThread(threading.Thread):
    def run(self):
        redis_pubsub.psubscribe("*")

        for message in redis_pubsub.listen():
            data = json.loads(message['data'])
            if message['type'] == "pmessage":

                # Server-wide notice from admin
                if message['channel'] == "server-notice":
                    for chat_id in clients.keys():
                        for client in clients[chat_id]:
                            client.send_message(
                                type = "alert-message warning",
                                user_id = "Server",
                                body = data['body']
                            )

                # Normal message to a specific chatroom
                else:
                    for client in clients[message['channel']]:
                        client.send_message(
                            type = data['type'],
                            user_id = data['user_id'],
                            body = data['body']
                        )


class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            ("/", MainHandler),
            ("/stranger", StrangerHandler),
            ("/([A-Za-z0-9_]{1,32})", ChatHandler),
            ("/websocket/([A-Za-z0-9_]{1,32})", WebSocketHandler),
            ("/.*", tornado.web.RedirectHandler, {'url': "/"}),
        ]
        settings = dict(
            gzip = True,
            login_url = "/",
            static_path = os.path.join(os.path.dirname(__file__), "static"),
            template_path = os.path.join(os.path.dirname(__file__),
                                         "templates"),
        )
        tornado.web.Application.__init__(self, handlers, **settings)


class RequestHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        return self.get_cookie("user_id")


class MainHandler(RequestHandler):
    def get(self):
        data = dict(
            num_users = redis_client.get("num_users"),
            num_chats = format(redis_client.zcard("chats"), ",d"),
            popular_chats = redis_client.zrevrange("chats", 0, 9, True),
            errors = [],
        )
        self.render("index.html", **data)


class StrangerHandler(RequestHandler):
    def get(self):
        stranger_id = redis_client.get("stranger_id")
        if stranger_id:
            chat_id = stranger_id
            if redis_client.llen(chat_id) > 0:
                redis_client.delete("stranger_id")
        else:
            alphanumeric = string.digits + string.letters
            chat_id = "".join([random.choice(alphanumeric) for i in xrange(7)])
            redis_client.set("stranger_id", chat_id)
        self.redirect("/%s" % (chat_id))


class ChatHandler(RequestHandler):
    @tornado.web.authenticated
    def get(self, chat_id):
        data = dict(
            num_users = redis_client.get("num_users"),
            num_chats = format(redis_client.zcard("chats"), ",d"),
            popular_chats = redis_client.zrevrange("chats", 0, 9, True),
        )

        # Check for valid user_id
        if not re.match("^[A-Za-z0-9_]{3,16}$", self.current_user):
            data['errors'] = ["Invalid username."]
            self.render("index.html", **data)
            return

        # Check user_id isn't in use in chat_id
        for user_id in redis_client.lrange(chat_id, 0, -1):
            if user_id == self.current_user:
                data['errors'] = [
                    "Username %s already in chatroom %s." \
                    % (self.current_user, chat_id)
                ]
                self.render("index.html", **data)
                return

        self.render("chat.html")


class WebSocketHandler(RequestHandler, tornado.websocket.WebSocketHandler):

    def send_message(self, body, type="chat", user_id=False):
        if not user_id:
            user_id = self.current_user
        message = dict(
            type = type,
            user_id = user_id,
            body = body,
        )
        self.write_message(json.dumps(message))

    def list_users(self):
        users = redis_client.lrange(self.chat_id, 0, -1)
        users.remove(self.current_user)
        if len(users) > 0:
            users.sort()
            body = "Currently chatting with " + ", ".join(users),
        else:
            body = "Waiting for someone to chat with.",
        self.send_message(body, type="alert-message block-message info")

    def open(self, chat_id):
        self.chat_id = chat_id
        redis_client.incr("num_users")
        redis_client.zincrby("chats", chat_id, 1)
        redis_client.rpush(chat_id, self.current_user)
        clients[chat_id].add(self)
        data = dict(
            type = "alert-message success",
            user_id = self.current_user,
            body = "has entered %s" % (chat_id),
        )
        redis_client.publish(chat_id, json.dumps(data))
        self.list_users()

    def on_close(self):
        try:
            clients[self.chat_id].remove(self)
            data = dict(
                type = "alert-message error",
                user_id = self.current_user,
                body = "has left %s" % (self.chat_id),
            )
            redis_client.publish(self.chat_id, json.dumps(data))
            redis_client.lrem(self.chat_id, self.current_user)
            redis_client.decr("num_users")
            if (redis_client.zincrby("chats", self.chat_id, -1) < 1):
                redis_client.zrem("chats", self.chat_id)
        except:
            pass

    def on_message(self, message):
        if message == "/users":
            self.list_users()
        else:
            data = dict(
                type = "chat",
                user_id = self.current_user,
                body = tornado.escape.linkify(message),
            )
            redis_client.publish(self.chat_id, json.dumps(data))


def main():
    if len(sys.argv) < 4:
        print "python ragechats.py <port> <num_processes> <redis_host>"
        exit()
    port = int(sys.argv[1])
    num_processes = int(sys.argv[2])
    redis_host = sys.argv[3]

    global redis_client
    global redis_pubsub
    redis_client = redis.Redis(redis_host)
    redis_pubsub = redis_client.pubsub()

    # Start with a fresh redis database
    redis_client.flushdb()

    pubsub = PubSubThread()

    # Allow Ctrl+C to exit cleanly
    pubsub.daemon = True

    app = Application()
    server = tornado.httpserver.HTTPServer(app)
    server.bind(port)
    server.start(num_processes)

    try:
        pubsub.start()
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        exit()

if __name__ == "__main__":
    main()
