import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const API_URL = 'https://lila-backend.onrender.com/api';


// Supabase configuration
const supabaseUrl = 'https://enzpvlvwgolrpxxhmret.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuenB2bHZ3Z29scnB4eGhtcmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMDM2MjksImV4cCI6MjA2MTg3OTYyOX0.tKIEOPlHJot-QT7j-AAkcmaHuWrmURBMULOz6ckxGHQ'; // Your public anon key (safe to expose)
const supabase = createClient(supabaseUrl, supabaseKey); // Changed variable name to match usage

async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        window.location.href = 'index.html';
    }
}

// Run auth check on page load
document.addEventListener('DOMContentLoaded', function () {
    checkAuth();

    // Set up event listeners only after DOM is loaded
    setupEventListeners();
});

// Function to set up all event listeners
function setupEventListeners() {
    // Handle login form submission
    if (document.getElementById('loginBtn')) {
        document.getElementById('loginBtn').addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                // Redirect to chat page on successful login
                window.location.href = 'index.html';
            } catch (error) {
                showError(error.message);
            }
        });
    }

    // Handle signup form submission
    if (document.getElementById('signupBtn')) {
        document.getElementById('signupBtn').addEventListener('click', async () => {
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsCheckbox = document.getElementById('terms');
            const termsAccepted = termsCheckbox ? termsCheckbox.checked : false;

            // Validation
            if (!name || !email || !password || !confirmPassword) {
                showError('Please fill in all fields');
                return;
            }

            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }

            if (termsCheckbox && !termsAccepted) {
                showError('Please accept the terms and conditions');
                return;
            }

            try {
                // Sign up the user
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name
                        }
                    }
                });

                if (error) throw error;

                // Show success message or redirect
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    showError('This email is already registered. Please log in instead.');
                } else {
                    showSuccess('Registration successful! Please check your email to confirm your account.');
                }
            } catch (error) {
                showError(error.message);
            }
        });
    }

    // Handle password reset request
    if (document.getElementById('resetBtn')) {
        document.getElementById('resetBtn').addEventListener('click', async () => {
            const email = document.getElementById('email').value;

            if (!email) {
                showError('Please enter your email address');
                return;
            }

            try {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password.html`,
                    // redirectTo: `https://lila.aifrica.life/reset-password.html`
                });

                if (error) throw error;

                showSuccess('Password reset link sent to your email!');
            } catch (error) {
                showError(error.message);
            }
        });
    }

    // Google OAuth login
    if (document.querySelector('.google-btn')) {
        document.querySelector('.google-btn').addEventListener('click', async () => {
            try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: `${window.location.origin}/index.html`
                        //    redirectTo: `https://lila.aifrica.life/index.html`
                    }
                });

                if (error) throw error;
            } catch (error) {
                showError(error.message);
            }
        });
    }
}

// Helper function to show error messages
function showError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create and insert error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const authForm = document.querySelector('.auth-form');
    if (authForm) {
        authForm.insertBefore(errorDiv, authForm.querySelector('button'));
    }
}

// Helper function to show success messages
function showSuccess(message) {
    // Remove any existing messages
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create and insert success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;

    const authForm = document.querySelector('.auth-form');
    if (authForm) {
        authForm.insertBefore(successDiv, authForm.querySelector('button'));
    }
}

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase.from('chats').select('count').limit(1);
        if (error) {
            console.error('Supabase connection error:', error);
        } else {
            console.log('Supabase connection successful:', data);
        }
    } catch (err) {
        console.error('Failed to connect to Supabase:', err);
    }
}

setTimeout(testSupabaseConnection, 1000);