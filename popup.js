document.getElementById('checkPage').addEventListener('click', async () => {
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      console.error("chrome.runtime.sendMessage is not defined.");
      alert("Error: Extension background script is not running.");
      return;
    }
  
    try {
      console.log("Sending message to background script...");
      chrome.runtime.sendMessage({ action: 'evaluatePage' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
          alert("Error: Unable to send message to the background script.");
        } else {
          console.log("Response from background script:", response);
          alert(response.message || "Action completed.");
        }
      });
    } catch (error) {
      console.error("Error in sendMessage:", error);
      alert("An unexpected error occurred.");
    }
  });
  