<p>
  Toolkit uses <a href="https://electron.atom.io/">Electron</a>, <a href="https://facebook.github.io/react/">React</a>, <a href="https://github.com/reactjs/react-router">React Router</a>, <a href="https://webpack.js.org/">Webpack</a> and <a href="https://www.npmjs.com/package/react-refresh">React Fast Refresh</a>.
</p>

<br>

## Screenshot

![](./screen/screen-main.png)
![](./screen/screen-dashboard.png)

## Install

Clone the repo and install dependencies:

```bash
npm install
```

## Starting Development

Start the app in the `dev` environment:

```bash
npm start
```

## Packaging for Production

To package apps for the local platform:

```bash
npm run package
```

分发mac 安装包

```
npm run package -- --mac
```

## Issue

Mac 安装问题：

```
sudo xattr -dr com.apple.quarantine /Applications/Toolkit.app
```

## Docs

See our [docs and guides here]()

## Plugin App Repositories

https://github.com/orgs/app-toolkit/repositories
