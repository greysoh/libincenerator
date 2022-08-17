const { WebSocket } = require("ws");

module.exports = class LibIncenerator {
  constructor(config) {
    if (typeof config != "object") {
      throw new Error("Config is not an object");
    }

    if (typeof config.host != "string") {
      throw new Error("Host is not a string");
    }

    if (typeof config.password != "string") {
      throw new Error("Password is not a string");
    }

    this.config = config;

    this.broadcasts = [];
    this.eventListeners = {
      "start": []
    }

    if (!this.config.disableAutostart) this.init();
  }

  connectionClass() {
    // Stupid fix to get our class data
    function sendData(data) {
      this.socket.send(data);
    }

    return class Socket {
      constructor(uuid) {
        this.uuid = uuid;
      }

      send(data) {
        const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const hexString = bufferData.toString("hex");


        sendData(JSON.stringify({
          "type": "data_response",
          "uuid": this.uuid,
          "data": hexString
        }));
      }
    }
  }

  init() {
    // Connect to server
    this.socket = new WebSocket(this.config.host);

    this.socket.on("open", () => {
      this.socket.send("Accept: Bearer " + this.config.password);

      this.socket.on("message", (data) => {
        const strData = data.toString();

        if (strData.startsWith("AcceptResponse Bearer")) {
          const bool = strData.split(":")[1] == "true";

          if (!bool) {
            throw new Error("Password is incorrect");
          }
        } else {
          const json = JSON.parse(strData);

          if (json.type == "connection") {
            
          } else if (json.type == "message") {
            this.broadcasts.push(json);
          }
        }
      });
    });
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }

    this.eventListeners[event].push(callback);
  }
}