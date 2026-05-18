# ChatGPT Full Context Injector Pro 🚀

An autonomous AI coding agent extension for Google Chrome & Brave that gives ChatGPT full architectural context of massive local codebases without crashing your browser or hitting token limits.

## 🌟 What does it do?
ChatGPT struggles when you try to copy-paste an entire project (e.g., 50,000 files) into the chat box. Browsers freeze, memory crashes, and you instantly hit OpenAI's token limit.

This extension solves that problem by turning ChatGPT into an **Autonomous Coding Agent**:
1. **Tree-First Architecture**: It rapidly scans your entire local workspace and extracts the directory structure plus a microscopic 300-byte code snippet from every file.
2. **Context Injection**: It feeds this architectural map into ChatGPT, giving the AI complete structural understanding of your app using almost zero memory.
3. **Autonomous Auto-Fetch**: When you ask a coding question, ChatGPT can autonomously request the specific files it needs to see (e.g., `[REQUEST_FILE: src/database.js]`). The extension detects this, fetches the live code from your hard drive, and automatically injects it into the chat!

## 🛠️ Features
- **Zero-Freeze Thread Yielding**: Safely process folders with 100,000+ files without locking up your browser.
- **Smart Noise Filtering**: Automatically ignores `.git`, `node_modules`, `venv`, logs, media, and binary files.
- **Micro-Snippets**: Reads only the first 2-3 lines of code (imports/class definitions) to give ChatGPT instant context.
- **Agentic Workflow**: Completely automates the process of answering "Which file is this in?"

## 📥 How to Install
1. Download or clone this repository to your computer.
2. Open Google Chrome or Brave and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle switch in the top right corner).
4. Click **Load unpacked** in the top left corner.
5. Select this extension folder.
6. The extension is now installed and active!

## 🚀 How to Use
1. Go to [chatgpt.com](https://chatgpt.com).
2. Look for the green **Context Injector** handle on the right side of the screen and click it to open the sidebar.
3. Click **Select Workspace (Tree First)** and choose your project folder from your computer.
4. The extension will map the workspace and automatically submit the architecture to ChatGPT.
5. Start asking questions! (e.g., *"Why is my database connection failing?"*)
6. ChatGPT will autonomously ask for the files it needs, and the extension will automatically fetch and inject them for you.

## ⚙️ Customization
You can customize the ignored files list by opening the **⚙️ Filters (.ignore)** accordion in the extension sidebar. You can easily reset to the highly-optimized defaults at any time.
