document.getElementById('open-chatgpt-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chatgpt.com' });
});
