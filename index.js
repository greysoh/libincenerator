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

  connectionClass(socket, broadcasts) {
    return class Socket {
      constructor(uuid) {
        this.uuid = uuid;
        this.eventListeners = {
          "message": []
        };

        this.internalRecv();
      }

      send(data) {
        const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const hexString = bufferData.toString("hex");

        socket.send(JSON.stringify({
          "type": "data_response",
          "uuid": this.uuid,
          "data": hexString
        }));
      }

      async internalRecv() {
        function sleep(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        while (true) {
          for (const i of broadcasts) {
            if (!i) continue;
            
            if (i.type == "data" && i.UUID == this.uuid) {
              const localCopy = JSON.parse(JSON.stringify(i));

              delete broadcasts[broadcasts.indexOf(i)];

              try {
                this.eventListeners["message"].forEach(i => i(Buffer.from(localCopy.data, "hex")));
              } catch (e) {
                console.error(e);
              }
            }
          }

          await sleep(10);
        }
      }

      on(event, callback) {
        if (typeof callback != "function") {
          throw new Error("Callback is not a function");
        }

        if (!this.eventListeners[event]) {
          throw new Error("Event does not exist");
        }

        this.eventListeners[event].push(callback);
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
          const bool = strData.split(":")[1].trim() == "true";

          if (!bool) {
            throw new Error("Password is incorrect");
          }
        } else {
          const json = JSON.parse(strData);

          if (json.type == "connection") {
            const connectionClass = this.connectionClass(this.socket, this.broadcasts);
            const socket = new connectionClass(json.uuid);
            this.eventListeners["connection"].forEach(i => i(socket));
          } else if (json.type == "data") {
            this.broadcasts.push(json);
          }
        }
      });
    });
  }

  on(event, callback) {
    if (typeof callback != "function") {
      throw new Error("Callback is not a function");
    }
    
    if (!this.eventListeners[event]) {
      throw new Error("Event does not exist");
    }

    this.eventListeners[event].push(callback);
  }
}