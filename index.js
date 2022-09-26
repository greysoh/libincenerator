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

    this.eventListeners = {
      "connection": []
    }

    if (!this.config.disableAutostart) this.init();
  }

  async init() {
    // Connect to server
    this.socket = new WebSocket(this.config.host);

    this.socket.on("open", async() => {
      this.socket.send("Accept: Bearer " + this.config.password);

      this.socket.on("message", async(data) => {
        const strData = data.toString();

        if (strData.startsWith("AcceptResponse Bearer")) {
          const bool = strData.split(":")[1].trim() == "true";

          if (!bool) {
            throw new Error("Password is incorrect");
          }
        } else {
          const json = JSON.parse(strData);

          if (json.type == "connection") {
            const ws = new WebSocket(`${this.config.host}/trident/${json.id}/${this.config.password}`);
            const eventListeners = this.eventListeners; // I don't know what I need to do this :/

            ws.on("open", async function() {
              return eventListeners["connection"].forEach(i => i(ws));
            });  
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