/* eslint-disable @typescript-eslint/no-unused-vars */
const express = require('express');
const portFinder = require('portfinder');

class WebContainer {
  private pluginMap = new Map();

  public async listenPlugin(pluginId: string, staticPath: string) {
    portFinder.setBasePort(10000);
    portFinder.setHighestPort(65535);
    const app = express();
    const port = await portFinder.getPortPromise();
    app.use(express.static(staticPath));

    const server = app.listen(port, () => {
      console.log(`${pluginId} Server is listening on port ${port}`);
    });
    this.pluginMap.set(pluginId, server);

    return port;
  }

  public closePlugin(pluginId: string) {
    const server = this.pluginMap.get(pluginId);
    if (server) {
      server.close(() => {
        console.log(`${pluginId} Server is closed`);
      });
    }
  }
}

export default WebContainer;
