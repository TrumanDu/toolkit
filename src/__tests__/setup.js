const { TextEncoder, TextDecoder } = require('util');

Object.assign(globalThis, { TextEncoder, TextDecoder });

// Mock window.electron for renderer tests
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(() => jest.fn()),
      once: jest.fn(),
      ipcSendSync: jest.fn(),
      ipcSend: jest.fn(),
    },
  },
  writable: true,
});

// Mock window.toolkit
Object.defineProperty(window, 'toolkit', {
  value: {
    goto: jest.fn(),
    mkdir: jest.fn(),
    list: jest.fn(),
    saveFile: jest.fn(),
    removeFile: jest.fn(),
    rename: jest.fn(),
  },
  writable: true,
});
