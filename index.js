import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
//import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const API_URL = 'https://lila-backend.onrender.com/api';

const supabaseUrl = 'https://enzpvlvwgolrpxxhmret.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuenB2bHZ3Z29scnB4eGhtcmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMDM2MjksImV4cCI6MjA2MTg3OTYyOX0.tKIEOPlHJot-QT7j-AAkcmaHuWrmURBMULOz6ckxGHQ'; // Your public anon key (safe to expose)
const supabaseClient = createClient(supabaseUrl, supabaseKey);


const chatInput = document.getElementById('chatInput');
const clearSearchBtn = document.getElementById('clearSearch');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const newChatBtn = document.getElementById('newChatBtn');
const typingIndicator = document.getElementById('typingIndicator');
const chatItems = document.querySelectorAll('.chat-list-item');
const searchInput = document.getElementById('searchInput');
const deleteChat = document.getElementById('deleteChat');
const backToHome = document.getElementById('backToHome');
//const contactUs = document.getElementById('contactUs');
const signOut = document.getElementById('signOut');

let currentChatId = 'default';
let currentUser = null;
let userChats = [];



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

        // Load user's chats from Supabase
        await loadUserChats();
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
async function loadUserChats() {
    try {
        console.log("Loading chats for user:", currentUser.id);
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch chats');
        }

        const data = await response.json();
        userChats = data || [];

        console.log("Loaded chats:", userChats.length);

        // Get the chats section
        const chatsSection = document.getElementById('chatsSection');

        // Clear everything except the chats header
        chatsSection.innerHTML = '';

        // Re-add the chats header
        const chatsHeader = document.createElement('div');
        chatsHeader.classList.add('chats-header');
        chatsHeader.textContent = 'Chats';
        chatsSection.appendChild(chatsHeader);

        // Group chats by date
        const chatsByDate = groupChatsByDate(userChats);

        // Add chats to sidebar
        let firstDateHeader = null;

        Object.keys(chatsByDate).forEach(date => {
            // Create date header
            const dateHeader = document.createElement('div');
            dateHeader.classList.add('date-header');
            dateHeader.textContent = date;

            if (!firstDateHeader) {
                firstDateHeader = dateHeader;
            }

            chatsSection.appendChild(dateHeader);

            // Add chat items for this date
            chatsByDate[date].forEach(chat => {
                const chatItem = createChatListItem(chat);
                chatsSection.appendChild(chatItem);
            });
        });

        // If there are chats, select the first one
        if (userChats.length > 0) {
            currentChatId = userChats[0].id;
            displayMessages(currentChatId);

            // Highlight the first chat
            const firstChatItem = document.querySelector('.chat-list-item');
            if (firstChatItem) {
                firstChatItem.classList.add('active');
            }
        } else {
            // Create a new chat if no chats exist
            console.log("No chats found, creating a new one");
            createNewChat();
        }
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';

    // Trigger the input event to update the search results
    searchInput.dispatchEvent(new Event('input'));

    // Focus back on the search input
    searchInput.focus();
});

// Group chats by date
function groupChatsByDate(chats) {
    const groups = {};

    chats.forEach(chat => {
        const date = new Date(chat.updated_at);
        let dateLabel;

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
            dateLabel = 'Today';
        } else if (isYesterday) {
            dateLabel = 'Yesterday';
        } else {
            // Check if within last 7 days
            const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
            if (daysDiff < 7) {
                dateLabel = '7 days ago';
            } else {
                // Format as month and day
                dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        }

        if (!groups[dateLabel]) {
            groups[dateLabel] = [];
        }

        groups[dateLabel].push(chat);
    });

    return groups;
}


// Create a chat list item element with delete and edit buttons
function createChatListItem(chat) {
    // Create the main container
    const chatItem = document.createElement('div');
    chatItem.classList.add('chat-list-item');
    chatItem.setAttribute('data-id', chat.id);

    // Create a span for the chat title (allows for better text overflow handling)
    const chatTitle = document.createElement('span');
    chatTitle.classList.add('chat-title');
    chatTitle.textContent = chat.title || 'New Chat';
    chatItem.appendChild(chatTitle);

    // Create button container for better positioning
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('chat-buttons');

    // Create edit button
    const editBtn = document.createElement('button');
    editBtn.classList.add('chat-edit-btn');
    editBtn.setAttribute('title', 'Edit chat name');

    // Create edit icon
    const editIcon = document.createElement('img');
    editIcon.classList.add('edit-icon');
    editIcon.src = './images/edit-button.svg';
    editIcon.alt = 'Edit';
    editBtn.appendChild(editIcon);

    // Add edit functionality
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent chat selection when clicking edit
        startEditingChatName(chat.id, chatTitle);
    });

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('chat-delete-btn');
    deleteBtn.setAttribute('title', 'Delete chat');

    // Create delete icon
    const deleteIcon = document.createElement('img');
    deleteIcon.classList.add('delete-icon');
    deleteIcon.src = './images/delete-icon.svg';
    deleteIcon.alt = 'Delete';
    deleteBtn.appendChild(deleteIcon);

    // Add delete functionality
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent chat selection when clicking delete

        if (confirm('Are you sure you want to delete this chat?')) {
            deleteChatById(chat.id);
        }
    });

    // Add buttons to container
    buttonContainer.appendChild(editBtn);
    buttonContainer.appendChild(deleteBtn);

    // Add button container to chat item
    chatItem.appendChild(buttonContainer);

    // Add click event for selecting the chat
    chatItem.addEventListener('click', function () {
        document.querySelectorAll('.chat-list-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        currentChatId = this.getAttribute('data-id');
        displayMessages(currentChatId);
    });

    return chatItem;
}

function startEditingChatName(chatId, titleElement) {
    // Create an input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'chat-title-edit';
    input.value = titleElement.textContent;
    input.maxLength = 50; // Reasonable max length

    // Store original text in case of cancel
    const originalText = titleElement.textContent;

    // Replace the title element with the input
    const chatItem = titleElement.closest('.chat-list-item');
    chatItem.classList.add('editing');

    // Replace title with input
    titleElement.style.display = 'none';
    chatItem.insertBefore(input, titleElement);

    // Focus the input and select all text
    input.focus();
    input.select();

    // Handle saving on Enter key
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await saveChatName(chatId, input.value.trim() || originalText);
            finishEditing(chatItem, titleElement, input);
        } else if (e.key === 'Escape') {
            // Cancel editing on Escape
            finishEditing(chatItem, titleElement, input, originalText);
        }
    });

    // Handle blur (clicking outside)
    input.addEventListener('blur', async () => {
        // Save if the value has changed
        if (input.value.trim() !== originalText && input.value.trim() !== '') {
            await saveChatName(chatId, input.value.trim());
        }
        finishEditing(chatItem, titleElement, input, input.value.trim() || originalText);
    });

    // Prevent the chat from being selected when clicking the input
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Function to finish editing and restore normal display
function finishEditing(chatItem, titleElement, input, newText = null) {
    // Remove editing class
    chatItem.classList.remove('editing');

    // Update title text if provided
    if (newText !== null) {
        titleElement.textContent = newText;
    }

    // Show the title element again
    titleElement.style.display = '';

    // Remove the input
    if (input && input.parentNode) {
        input.parentNode.removeChild(input);
    }
}

// Function to save the new chat name to the server
async function saveChatName(chatId, newName) {
    try {
        // Find the chat in local array
        const chat = userChats.find(c => c.id === chatId);
        if (!chat) return;

        // Update in backend API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: newName,
                messages: chat.messages || []
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update chat name');
        }

        // Update in local array
        chat.title = newName;

        console.log(`Chat name updated to: ${newName}`);
    } catch (error) {
        console.error('Error saving chat name:', error);
        // You could show an error message to the user here
    }
}

async function createNewChat() {
    try {
        console.log("Creating new chat for user:", currentUser.id);

        // Create new chat in Supabase
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to create chat');
        }

        const newChat = await response.json();
        currentChatId = newChat.id;

        // Add to local array
        userChats.unshift(newChat);

        // Add to UI
        const chatsSection = document.getElementById('chatsSection');

        // Find or create "Today" header
        let todayHeader = Array.from(chatsSection.querySelectorAll('.date-header'))
            .find(header => header.textContent === 'Today');

        if (!todayHeader) {
            todayHeader = document.createElement('div');
            todayHeader.classList.add('date-header');
            todayHeader.textContent = 'Today';

            // Insert after the "Chats" header
            const chatsHeader = chatsSection.querySelector('.chats-header');
            if (chatsHeader) {
                chatsSection.insertBefore(todayHeader, chatsHeader.nextSibling);
            } else {
                chatsSection.appendChild(todayHeader);
            }
        }

        const chatItem = createChatListItem(newChat);

        // Insert after the "Today" header
        chatsSection.insertBefore(chatItem, todayHeader.nextSibling);

        // Activate the new chat
        document.querySelectorAll('.chat-list-item').forEach(i => i.classList.remove('active'));
        chatItem.classList.add('active');

        // Clear messages
        chatMessages.innerHTML = '';

        console.log("New chat UI updated");
        return newChat;
    } catch (error) {
        console.error('Error creating new chat:', error);
        return null;
    }
}

function getThinkingMessage() {
    const messages = [
        "Thinking...",
        "Let me think...",
        "Hmm...",
        "Considering that..."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

// Delete a chat by ID
async function deleteChatById(chatId) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete chat');
        }

        // Remove from UI
        const chatElement = document.querySelector(`.chat-list-item[data-id="${chatId}"]`);
        if (chatElement) {
            // Check if this was the active chat
            const wasActive = chatElement.classList.contains('active');

            // Get the date header
            const dateHeader = chatElement.previousElementSibling;

            // Remove the chat element
            chatElement.remove();

            // Check if this was the last chat under this date header
            if (dateHeader && dateHeader.classList.contains('date-header')) {
                const nextElement = dateHeader.nextElementSibling;
                if (!nextElement || nextElement.classList.contains('date-header')) {
                    // No more chats under this date header, remove it
                    dateHeader.remove();
                }
            }

            // Remove from local array
            userChats = userChats.filter(chat => chat.id !== chatId);

            // If this was the active chat, select another one
            if (wasActive) {
                if (userChats.length > 0) {
                    currentChatId = userChats[0].id;
                    const firstChatItem = document.querySelector('.chat-list-item');
                    if (firstChatItem) {
                        firstChatItem.classList.add('active');
                    }
                    displayMessages(currentChatId);
                } else {
                    // No chats left, create a new one
                    createNewChat();
                }
            }
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
}

// Get chat history from Supabase
async function getChatHistory(chatId) {
    try {
        // Find the chat in the loaded chats
        const chat = userChats.find(c => c.id === chatId);

        if (chat) {
            return chat.messages || [];
        }
        // If not found in loaded chats, fetch from backend API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch chat history');
        }

        const data = await response.json();


        return data.messages || [];
    } catch (error) {
        console.error('Error getting chat history:', error);
        return [];
    }
}

/* Save chat history to Supabase
async function saveChatHistory(chatId, history) {
    try {
        // Update the chat title based on the first user message if it's "New Chat"
        let title = 'New Chat';
        const chat = userChats.find(c => c.id === chatId);

        if (history.length > 0) {
            const firstUserMessage = history.find(msg => msg.role === 'user');
            if (firstUserMessage) {
                // Use first 30 chars of first message as title
                title = firstUserMessage.parts[0].text.substring(0, 30);
                if (firstUserMessage.parts[0].text.length > 30) {
                    title += '...';
                }
            }
        }

        // Update in backend API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: history,
                title: chat && chat.title !== 'New Chat' ? chat.title : title
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save chat history');
        }


        // Update the chat title in the UI if it's a new chat
        if (chat && chat.title === 'New Chat') {
            const chatItem = document.querySelector(`.chat-list-item[data-id="${chatId}"]`);
            if (chatItem) {
                chatItem.textContent = title;
            }

            // Update in our local array
            chat.title = title;
        }
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}*/

async function saveChatHistory(chatId, history) {
    try {
        // Update the chat title based on the first user message if it's "New Chat"
        let title = 'New Chat';
        const chat = userChats.find(c => c.id === chatId);

        // Only auto-generate title if it's still the default "New Chat"
        if (chat && chat.title === 'New Chat' && history.length > 0) {
            const firstUserMessage = history.find(msg => msg.role === 'user');
            if (firstUserMessage) {
                // Use first 30 chars of first message as title
                title = firstUserMessage.parts[0].text.substring(0, 30);
                if (firstUserMessage.parts[0].text.length > 30) {
                    title += '...';
                }
            }
        } else if (chat) {
            // Keep the existing title (which might be custom)
            title = chat.title;
        }

        // Update in backend API
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: history,
                title: title
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save chat history');
        }

        // Update the chat title in the UI if it's a new chat
        if (chat && chat.title === 'New Chat') {
            const chatItem = document.querySelector(`.chat-list-item[data-id="${chatId}"]`);
            if (chatItem) {
                const titleElement = chatItem.querySelector('.chat-title');
                if (titleElement) {
                    titleElement.textContent = title;
                }
            }

            // Update in our local array
            chat.title = title;
        }
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Function to display messages in the UI
const displayMessages = async (chatId) => {
    // Clear all messages
    chatMessages.innerHTML = '';

    // Get chat history
    const history = await getChatHistory(chatId);

    // Add messages to UI
    history.forEach(message => {
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
    // Replace multiple newlines with proper paragraph breaks
    let formatted = text.replace(/\n{3,}/g, '\n\n');

    // Split by newlines and process each paragraph
    const paragraphs = formatted.split('\n\n');

    // Process each paragraph
    return paragraphs.map(paragraph => {
        // Skip empty paragraphs
        if (!paragraph.trim()) return '';

        // Check if it's a list item
        if (/^[*\-•]/.test(paragraph.trim())) {
            // It's likely a list, preserve the formatting
            const listItems = paragraph.split('\n').map(item => {
                return `<li>${item.replace(/^[*\-•]\s*/, '')}</li>`;
            }).join('');
            return `<ul>${listItems}</ul>`;
        }

        // Check if it's a numbered list
        if (/^\d+[.)]/.test(paragraph.trim())) {
            const listItems = paragraph.split('\n').map(item => {
                return `<li>${item.replace(/^\d+[.)]\s*/, '')}</li>`;
            }).join('');
            return `<ol>${listItems}</ol>`;
        }

        // Check if it's a heading (starts with # or ##)
        if (/^#{1,3}\s/.test(paragraph.trim())) {
            const level = paragraph.match(/^(#{1,3})\s/)[1].length;
            const headingText = paragraph.replace(/^#{1,3}\s/, '');
            return `<h${level + 2}>${headingText}</h${level + 2}>`;
        }

        // Regular paragraph
        return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}


const sendMessageToGemini = async (message, chatId) => {
    try {
        // Create and show typing indicator with typewriter effect
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

        // Get chat history
        const chatHistory = await getChatHistory(chatId);

        // Add user message to history
        chatHistory.push({
            role: "user",
            parts: [{ text: message }]
        });

        // Save updated history
        await saveChatHistory(chatId, chatHistory);

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
                chatId,
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
        await saveChatHistory(chatId, chatHistory);

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
        await sendMessageToGemini(message, currentChatId);
    } catch (error) {
        console.error("Failed to get response:", error);
    }
};

// Delete a chat
async function deleteCurrentChat() {
    if (!currentChatId) return;

    try {
        // Delete from Supabase
        const { error } = await supabaseClient
            .from('chats')
            .delete()
            .eq('id', currentChatId);

        if (error) throw error;

        // Remove from UI
        const activeChat = document.querySelector(`.chat-list-item[data-id="${currentChatId}"]`);
        if (activeChat) {
            activeChat.remove();
        }

        // Remove from local array
        userChats = userChats.filter(chat => chat.id !== currentChatId);

        // Select another chat or create a new one
        if (userChats.length > 0) {
            currentChatId = userChats[0].id;
            const firstChatItem = document.querySelector('.chat-list-item');
            if (firstChatItem) {
                firstChatItem.classList.add('active');
            }
            displayMessages(currentChatId);
        } else {
            createNewChat();
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
}

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

newChatBtn.addEventListener('click', () => {
    console.log("New chat button clicked");
    createNewChat();
});


backToHome.addEventListener('click', () => {
    window.location.href = 'https://aifricaapp.com';
});

/*contactUs.addEventListener('click', () => {
    window.location.href = 'mailto:support@aifricaapp.com';
});*/

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

// Replace the simple filtering with this enhanced version that highlights matches
searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Show/hide clear button based on input content
    if (searchInput.value) {
        clearSearchBtn.style.display = 'flex';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    const chatItems = document.querySelectorAll('.chat-list-item');

    // Track if we have any matches
    let hasMatches = false;

    // Track which date headers have visible chats
    const dateHeaders = document.querySelectorAll('.date-header');
    const visibleHeaderMap = {};

    // Initialize all headers as not having visible items
    dateHeaders.forEach(header => {
        visibleHeaderMap[header.textContent] = false;
    });

    // Filter chat items
    chatItems.forEach(item => {
        const titleElement = item.querySelector('.chat-title') || item;
        const originalText = titleElement.getAttribute('data-original-text') || titleElement.textContent;

        // Store original text if not already stored
        if (!titleElement.getAttribute('data-original-text')) {
            titleElement.setAttribute('data-original-text', originalText);
        }

        if (searchTerm && originalText.toLowerCase().includes(searchTerm)) {
            item.style.display = 'flex'; // or whatever your default display value is
            hasMatches = true;

            // Highlight matching text
            const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
            titleElement.innerHTML = originalText.replace(regex, '<span class="highlight">$1</span>');

            // Find the preceding date header
            let header = item.previousElementSibling;
            while (header && !header.classList.contains('date-header')) {
                header = header.previousElementSibling;
            }

            if (header && header.classList.contains('date-header')) {
                visibleHeaderMap[header.textContent] = true;
            }
        } else {
            // Reset to original text if no search term or no match
            if (!searchTerm) {
                titleElement.textContent = originalText;
                item.style.display = 'flex'; // Show all items when search is cleared

                // Find the preceding date header
                let header = item.previousElementSibling;
                while (header && !header.classList.contains('date-header')) {
                    header = header.previousElementSibling;
                }

                if (header && header.classList.contains('date-header')) {
                    visibleHeaderMap[header.textContent] = true;
                }
            } else {
                item.style.display = 'none';
            }
        }
    });

    // Show/hide date headers based on whether they have visible chats
    dateHeaders.forEach(header => {
        header.style.display = visibleHeaderMap[header.textContent] ? 'block' : 'none';
    });

    // Show a "no results" message if needed
    let noResultsMsg = document.getElementById('no-search-results');

    if (!hasMatches && searchTerm) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.id = 'no-search-results';
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.textContent = 'No chats match your search';

            const chatsSection = document.getElementById('chatsSection');
            // Insert after the "Chats" header
            const chatsHeader = chatsSection.querySelector('.chats-header');
            if (chatsHeader && chatsHeader.nextSibling) {
                chatsSection.insertBefore(noResultsMsg, chatsHeader.nextSibling);
            } else {
                chatsSection.appendChild(noResultsMsg);
            }
        }
        noResultsMsg.style.display = 'block';
    } else if (noResultsMsg) {
        noResultsMsg.style.display = 'none';
    }

    // Add visual indicator that search is active
    const chatsSection = document.getElementById('chatsSection');
    if (searchTerm) {
        chatsSection.classList.add('search-active');
    } else {
        chatsSection.classList.remove('search-active');
    }
});

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
}, 10000); // 10 seconds max loading time