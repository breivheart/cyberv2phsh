let modelData;

// Load the model JSON
async function loadModel() {
  const response = await fetch(chrome.runtime.getURL('model_data.json'));
  modelData = await response.json();
}

// Apply PCA transformation
function applyPCA(features, components, mean) {
  if (!components || !mean) {
    console.error("PCA components or mean are undefined.");
    return [];
  }

  return components.map((component) =>
    component.reduce((sum, c, idx) => {
      if (features[idx] === undefined || mean[idx] === undefined) {
        console.error(`Undefined feature or mean at index ${idx}`);
        return sum;
      }
      return sum + (features[idx] - mean[idx]) * c;
    }, 0)
  );
}

// Extract features from the DOM
function extractFeatures(dom, url) {
    return [
      (url.match(/\./g) || []).length, // Count dots in the URL
      (url.match(/-/g) || []).length, // Count hyphens in the URL
      (url.match(/\//g) || []).length, // Count slashes in the URL
      (url.match(/\?/g) || []).length, // Count question marks in the URL
      (url.match(/@/g) || []).length, // Count "@" symbols in the URL
      (url.match(/=/g) || []).length, // Count "=" symbols in the URL
      url.length > 100 ? 1 : 0, // Check if URL length is long
      dom.forms.length, // Number of forms on the page
      dom.links.length, // Number of links on the page
      dom.body.toLowerCase().includes('login') ? 1 : 0, // Check for "login"
      url.startsWith('http://') ? 1 : 0, // Check if the page is not HTTPS
    ];
  }
  

// Predict phishing
function predictPhishing(features) {
  const pcaComponents = modelData.pca_components;
  const pcaMean = modelData.pca_mean;

  // Apply PCA
  const pcaFeatures = applyPCA(features, pcaComponents, pcaMean);

  // Use Random Forest model (example rule-based implementation)
  const importances = modelData.feature_importances;
  const score = pcaFeatures.reduce((sum, feature, idx) => sum + feature * importances[idx], 0);

  if (score > 0.32) {
    return { safe: false, message: 'Phishing Attempt Detected! This page is NOT safe.' };
  } else {
    return { safe: true, message: 'Page is Safe.' };
  }
}

// Add a warning banner for unsafe pages
function injectWarningBanner(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const banner = document.createElement('div');
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.width = '100%';
      banner.style.padding = '10px';
      banner.style.backgroundColor = 'red';
      banner.style.color = 'white';
      banner.style.textAlign = 'center';
      banner.style.zIndex = '9999';
      banner.textContent = 'WARNING: This page is flagged as unsafe. Proceed with caution.';
      document.body.appendChild(banner);
    },
  });
}

// Evaluate the current page
async function evaluatePage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      console.error("Cannot evaluate Chrome internal pages or unsupported URLs:", tab.url);
      return Promise.reject("Unsupported URL.");
    }
  
    console.log("Evaluating page with URL:", tab.url);
  
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => {
            return {
              url: window.location.href,
              dom: {
                forms: document.forms.length,
                links: document.links.length,
                body: document.body.textContent || "",
              },
            };
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError.message);
            reject("Unable to evaluate the page. Please try a different URL.");
            return;
          }
  
          const pageData = results[0]?.result;
          if (!pageData) {
            console.error("Failed to retrieve page data.");
            reject("Unable to evaluate the page. Page data is unavailable.");
            return;
          }
  
          const { url, dom } = pageData;
          const features = extractFeatures(dom, url);
          console.log("Extracted Features:", features);
  
          const { safe, message } = predictPhishing(features);
          console.log("Prediction Result:", { safe, message });
  
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (message) => alert(message),
            args: [message],
          });
  
          if (!safe) {
            injectWarningBanner(tab.id);
          }
  
          resolve();
        }
      );
    });
  }
  

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);
  
    if (message.action === 'evaluatePage') {
      console.log("Starting page evaluation...");
      
      // Perform asynchronous evaluation
      evaluatePage()
        .then(() => {
          console.log("Page evaluation complete.");
          sendResponse({ message: "Page evaluation complete." });
        })
        .catch((error) => {
          console.error("Error during page evaluation:", error);
          sendResponse({ message: "An error occurred during page evaluation." });
        });
  
      // Return true to indicate the response will be sent asynchronously
      return true;
    }
  
    // For other actions, send a generic response
    sendResponse({ message: "Unknown action." });
  });
  

loadModel();
