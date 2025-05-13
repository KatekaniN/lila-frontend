import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const API_URL = 'https://lila-backend.onrender.com/api';

const supabaseUrl = 'https://enzpvlvwgolrpxxhmret.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuenB2bHZ3Z29scnB4eGhtcmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMDM2MjksImV4cCI6MjA2MTg3OTYyOX0.tKIEOPlHJot-QT7j-AAkcmaHuWrmURBMULOz6ckxGHQ'; // Your public anon key (safe to expose)
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const typingIndicator = document.getElementById('typingIndicator');
const backToHome = document.getElementById('backToHome');
const signOut = document.getElementById('signOut');

let currentChatId = 'default'; // Fixed chat ID
let currentUser = null;
let chatHistory = []; // Store chat history locally

// Check if user is logged in
async function checkAuth() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
            // Redirect to login page if not logged in
            window.location.href = 'login.html';
            return;
        }

        currentUser = user;
        console.log("User authenticated:", user.email);

        // Load the single chat
        await loadChat();
    } catch (error) {
        console.error("Authentication error:", error);
        window.location.href = 'login.html';
    }
}

async function getAuthToken() {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token;
}

// Loading screen handling
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContent = document.getElementById('app-content');

    if (loadingScreen) {
        // First make app content visible but with opacity 0
        if (appContent) {
            appContent.style.display = 'flex'; // or whatever display value is appropriate
            appContent.style.opacity = '0';
        }

        // Add hidden class to loading screen (starts fade out)
        loadingScreen.classList.add('hidden');

        // After loading screen starts fading out, fade in the app content
        setTimeout(() => {
            if (appContent) {
                appContent.style.transition = 'opacity 0.3s ease-in';
                appContent.style.opacity = '1';
            }

            // Finally remove loading screen from DOM after transition completes
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500); // Match this to your CSS transition time
        }, 200); // Small delay before starting app content fade-in
    }
}

async function loadChat() {
    try {
        // Load chat history from backend API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats/default`, { // Assuming 'default' is your fixed chat ID
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // If the chat doesn't exist, create it
            if (response.status === 404) {
                await createDefaultChat();
                return;
            }
            throw new Error('Failed to fetch chat');
        }

        const data = await response.json();
        chatHistory = data.messages || []; // Load messages into local history
        displayMessages(); // Display the loaded messages
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

async function createDefaultChat() {
    try {
        console.log("Creating default chat for user:", currentUser.id);

        // Create new chat in backend API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id: 'default', // Set the ID to 'default'
                title: 'My Chat' // Set a default title
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create chat');
        }

        const newChat = await response.json();
        currentChatId = newChat.id;
        chatHistory = []; // Initialize chat history

        console.log("New default chat created");
    } catch (error) {
        console.error('Error creating new chat:', error);
    }
}

function getThinkingMessage() {
    const messages = [
        "Ag, that's an interesting one...",
        "Yebo, I'm processing that...",
        "Shap shap, gathering my thoughts...",
        "Just now, I'll have something for you...",
        "Hmm, let me tap into my Jozi wisdom...",
        "Connecting to my Cape Town creative vibes...",
        "Lekker question! Let me ponder...",
        "Digging into my South African soul for this one...",
        "Hayi, that's got me thinking...",
        "Ubuntu wisdom loading...",
        "Brewing some thoughts like a proper rooibos...",
        "Vibing with that question...",
        "Eish, that's deep! Thinking...",
        "Connecting to my digital soul...",
        "Channeling my inner creative...",
        "Aweh, let me explore that...",
        "Ja, I'm on it...",
        "Cooking up something lekker for you...",
        "Searching my Mzansi memories..."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

/* Save chat history to Supabase */
async function saveChatHistory() {
    try {
        // Update in backend API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats/default`, { // Use fixed chat ID
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: chatHistory,
                title: 'My Chat' // Fixed title
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save chat history');
        }
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Function to display messages in the UI
const displayMessages = () => {
    // Clear all messages
    chatMessages.innerHTML = '';

    // Add messages to UI
    chatHistory.forEach(message => {
        if (message.role === "user" || message.role === "model") {
            addMessageToUI(message.parts[0].text, message.role === "user");
        }
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Function to add a message to the UI
// Function to add a message to the UI with improved formatting
const addMessageToUI = (text, isUser = true) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isUser ? 'user' : 'ai');

    if (!isUser) {
        const avatar = document.createElement('img');
        avatar.src = './images/lila-avatar.jpg';
        avatar.alt = 'AI';
        avatar.classList.add('message-avatar');
        messageDiv.appendChild(avatar);

        // Format AI responses for better readability
        const formattedContent = document.createElement('div');
        formattedContent.classList.add('formatted-content');

        // Process the text to improve formatting
        const formattedText = formatAIResponse(text);
        formattedContent.innerHTML = formattedText;

        messageDiv.appendChild(formattedContent);
    } else {
        // For user messages, keep it simple
        messageDiv.appendChild(document.createTextNode(text));
    }

    // Only insert before typingIndicator if it's still in the DOM
    if (chatMessages.contains(typingIndicator)) {
        chatMessages.insertBefore(messageDiv, typingIndicator);
    } else {
        chatMessages.appendChild(messageDiv);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Helper function to format AI responses
function formatAIResponse(text) {
    // Handle markdown-style formatting
    let formatted = text;

    // Handle bold text (both ** and __ formats)
    formatted = formatted.replace(/\*\*(.*?)\*\*|__(.*?)__/g, (match, g1, g2) => {
        const content = g1 || g2;
        return `<strong>${content}</strong>`;
    });

    // Handle italic text (both * and _ formats)
    formatted = formatted.replace(/\*(.*?)\*|_(.*?)_/g, (match, g1, g2) => {
        // Skip if it's part of a bold pattern we already handled
        if (match.startsWith('**') || match.startsWith('__')) return match;
        const content = g1 || g2;
        return `<em>${content}</em>`;
    });

    // Replace multiple newlines with proper paragraph breaks
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Split by double newlines (paragraph breaks)
    const paragraphs = formatted.split('\n\n');

    // Process each paragraph
    return paragraphs.map(paragraph => {
        // Skip empty paragraphs
        if (!paragraph.trim()) return '';

        // Check if it's a heading (starts with # or ##)
        if (/^#{1,3}\s/.test(paragraph.trim())) {
            const level = paragraph.match(/^(#{1,3})\s/)[1].length;
            const headingText = paragraph.replace(/^#{1,3}\s/, '');
            return `<h${level + 2}>${headingText}</h${level + 2}>`;
        }

        // Check if the paragraph contains bullet points
        if (paragraph.includes('\n* ') || paragraph.includes('\n- ') || paragraph.includes('\n• ') ||
            paragraph.trim().startsWith('* ') || paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('• ')) {

            // Split into lines and process each line
            const lines = paragraph.split('\n');
            let inList = false;
            let html = '';

            lines.forEach(line => {
                const trimmedLine = line.trim();
                // Check if this line is a list item
                if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
                    // Start list if not already in one
                    if (!inList) {
                        html += '<ul>';
                        inList = true;
                    }
                    // Add list item
                    const itemContent = trimmedLine.replace(/^[*\-•]\s+/, '');
                    html += `<li>${itemContent}</li>`;
                } else {
                    // End list if we were in one
                    if (inList) {
                        html += '</ul>';
                        inList = false;
                    }
                    // Add regular text
                    if (trimmedLine) {
                        html += `<p>${trimmedLine}</p>`;
                    }
                }
            });

            // Close list if still open
            if (inList) {
                html += '</ul>';
            }

            return html;
        }

        // Check if it's a numbered list
        if (/^\d+[.)]/.test(paragraph.trim()) || paragraph.includes('\n1. ')) {
            // Split into lines and process each line
            const lines = paragraph.split('\n');
            let inList = false;
            let html = '';

            lines.forEach(line => {
                const trimmedLine = line.trim();
                // Check if this line is a numbered list item
                if (/^\d+[.)]/.test(trimmedLine)) {
                    // Start list if not already in one
                    if (!inList) {
                        html += '<ol>';
                        inList = true;
                    }
                    // Add list item
                    const itemContent = trimmedLine.replace(/^\d+[.)]\s+/, '');
                    html += `<li>${itemContent}</li>`;
                } else {
                    // End list if we were in one
                    if (inList) {
                        html += '</ol>';
                        inList = false;
                    }
                    // Add regular text
                    if (trimmedLine) {
                        html += `<p>${trimmedLine}</p>`;
                    }
                }
            });

            // Close list if still open
            if (inList) {
                html += '</ol>';
            }

            return html;
        }

        return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}

const sendMessageToGemini = async (message) => {
    try {
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typingIndicator';
        typingIndicator.className = 'typing';

        const typewriterText = document.createElement('div');
        typewriterText.className = 'typewriter';
        typewriterText.textContent = getThinkingMessage();
        typewriterText.color = '#fba0b7'

        //typingIndicator.appendChild(avatar);
        typingIndicator.appendChild(typewriterText);

        // Add to chat messages
        chatMessages.appendChild(typingIndicator);
        typingIndicator.style.display = 'block';

        // Scroll to bottom to show typing indicator
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add user message to history
        chatHistory.push({
            role: "user",
            parts: [{ text: message }]
        });

        // Save updated history
        await saveChatHistory();

        // Call backend API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message,
                chatId: 'default', // Use fixed chat ID
                history: chatHistory
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const responseText = data.response;

        // Add AI response to history
        chatHistory.push({
            role: "model",
            parts: [{ text: responseText }]
        });

        // Save updated history with AI response
        await saveChatHistory();

        // Remove typing indicator
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }

        // Display AI response
        addMessageToUI(responseText, false);

        return responseText;
    } catch (error) {
        console.error("Error calling API:", error);

        // Remove typing indicator
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }

        // Show error message
        addMessageToUI("Eish! Sorry, I'm having trouble connecting right now. Can you try again later?", false);

        throw error;
    }
};

// Function to handle sending a message
const handleSendMessage = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to UI
    addMessageToUI(message, true);

    // Clear input
    chatInput.value = '';

    // Send to API
    try {
        await sendMessageToGemini(message);
    } catch (error) {
        console.error("Failed to get response:", error);
    }
};

// Handle sign out
async function handleSignOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// Event listeners
sendBtn.addEventListener('click', handleSendMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

backToHome.addEventListener('click', () => {
    window.location.href = 'https://aifricaapp.com';
});

signOut.addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out?')) {
        handleSignOut();
    }
});

// Initialize the app

// Modify your initApp function
async function initApp() {
    console.log("Initializing app...");
    try {
        // First check if backend is available
        try {
            const response = await fetch(`${API_URL}/health`, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' },
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                console.warn("Backend health check failed");
            }
        } catch (error) {
            console.warn("Backend might be starting up:", error);
        }

        // Check authentication
        await checkAuth();

        // Only now hide the loading screen
        hideLoadingScreen();
    } catch (error) {
        console.error("Error during initialization:", error);
        // Still hide loading screen even if there's an error
        hideLoadingScreen();
    }
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        console.log("Page is now visible, checking auth status");
        // Check auth status when page becomes visible again
        checkAuth();
    }
});

// Detect slow connections
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
if (connection && (connection.effectiveType === '2g' || connection.saveData)) {
    console.log("Slow connection detected, optimizing loading");
    document.querySelector('.loading-text').textContent = 'Loading... (Slow connection detected)';
}

// Add a progress indicator for slow connections
let loadingProgress = 0;
const progressInterval = setInterval(() => {
    loadingProgress += 5;
    if (loadingProgress > 95) {
        clearInterval(progressInterval);
    }
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = `Loading... ${loadingProgress}%`;
    }
}, 500);

// Clear the interval when the page is loaded
window.addEventListener('load', () => {
    clearInterval(progressInterval);
});

// Don't hide loading screen immediately on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    // Start the app initialization process
    initApp();
});

// Add a timeout to ensure loading screen doesn't stay forever
setTimeout(() => {
    hideLoadingScreen();
}, 10000);