// ==========================================
// 1. CONFIGURATION & AUTH
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDL7VNmyefiYyljOXmMNkmIAOLLMEGwa6o",
    authDomain: "quickbite-151cc.firebaseapp.com",
    projectId: "quickbite-151cc",
    storageBucket: "quickbite-151cc.firebasestorage.app",
    messagingSenderId: "976050846735",
    appId: "1:976050846735:web:44471f1e06226fe7e2b77a"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// SIGNUP LOGIC
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        auth.createUserWithEmailAndPassword(email, password).then((u) => {
            return db.collection("users").doc(u.user.uid).set({ role: "student", email: email });
        }).then(() => {
            alert("Account created! Now please log in.");
            window.location.href = "index.html"; 
        }).catch((err) => {
            const errorElement = document.getElementById('signup-error');
            if (errorElement) errorElement.innerText = "Signup Failed: " + err.message;
            else alert("Signup Failed: " + err.message);
        });
    });
}

// LOGIN LOGIC
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const role = document.getElementById('login-role').value.toLowerCase();

        auth.signInWithEmailAndPassword(email, password).then((u) => {
            return db.collection("users").doc(u.user.uid).get();
        }).then((doc) => {
            if (doc.exists && doc.data().role === role) {
                window.location.href = (role === 'admin') ? "admin.html" : "menu.html";
            } else {
                alert("Unauthorized: Incorrect role selected.");
                auth.signOut();
            }
        }).catch(err => alert("Login Failed: " + err.message));
    });
}

//// ==========================================
// 2. MASTER AUTH & UI UPDATER (FINAL VERSION)
// ==========================================

auth.onAuthStateChanged((user) => {
    // References to UI elements
    const userDisplay = document.getElementById('user-display-name');
    const userIdDisplay = document.getElementById('user-id-display');
    const trackBtn = document.getElementById('track-order-btn');
    const tokenPageCheck = document.getElementById('display-token-page');

    if (user) {
    // This displays the email (ID) on whichever page the user is on
    const userIdDisplay = document.getElementById('user-id-display');
    if (userIdDisplay) {
        userIdDisplay.innerText = user.email; 
    }

        // B. Display Capitalized Name
        if (userDisplay) {
            const rawName = user.email.split('@')[0];
            userDisplay.innerText = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        }

        // C. Real-time Order Tracking (Runs on Menu & Token pages)
        db.collection("orders")
            .where("customerEmail", "==", user.email)
            .orderBy("timestamp", "desc")
            .limit(1)
            .onSnapshot((querySnapshot) => {
                if (!querySnapshot.empty) {
                    const latestOrder = querySnapshot.docs[0].data();
                    
                    // Update Token Page specific text
                    if (tokenPageCheck) {
                        tokenPageCheck.innerText = latestOrder.token;
                        if (typeof updateStatusUI === "function") updateStatusUI(latestOrder.status);
                    }

                    // Show/Update "Track Order" button on Menu page
                    if (trackBtn) {
                        if (latestOrder.status !== "Collected") {
                            trackBtn.style.display = 'block';
                            trackBtn.innerText = `🚚 Track Order #${latestOrder.token} (${latestOrder.status})`;
                        } else {
                            trackBtn.style.display = 'none';
                        }
                    }
                }
            }, (error) => {
                console.error("Tracking Error: ", error);
            });

    } else {
        // D. Security Redirect (If logged out)
        const path = window.location.pathname;
        const isPublicPage = path.endsWith("index.html") || path === "/" || path.endsWith("signup.html");
        
        if (!isPublicPage) {
            window.location.href = "index.html";
        }
    }
});

// FIX: Attach to window so HTML buttons can always see it
window.goHome = () => {
    window.location.href = "menu.html";
};
// ==========================================
// 3. MENU RENDERER (Optimized with .get() to prevent search lag)
// ==========================================
function loadMenu(category = "All", searchTerm = "", specialFilter = null) {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;

    let query = db.collection("menuItems");

    if (category !== "All") {
        query = query.where("category", "==", category);
    }

    if (specialFilter === "instant") {
        query = query.where("prepTime", "<=", 10);
    } else if (specialFilter === "popular") {
        query = query.where("isPopular", "==", true);
    }
    }); 
}); 
} 
    //new added
query.onSnapshot((snapshot) => {
    menuGrid.innerHTML = ""; // Clear the grid ONCE at the start of the update
    
    snapshot.forEach((doc) => {
        const item = doc.data();
        const itemName = item.name.toLowerCase();
        const isSoldOut = item.status === "Sold Out";

        // Only show items that match the search term
        if (itemName.includes(searchTerm.toLowerCase())) {
            menuGrid.innerHTML += `
                <div class="food-card" style="${isSoldOut ? 'opacity: 0.7; filter: grayscale(0.8);' : ''}">
                    <img src="${item.imageURL || 'https://via.placeholder.com/300x200'}" class="food-img">
                    <div style="padding: 15px;">
                        <h3>${item.name} ${isSoldOut ? '<span style="color:red; font-size:12px;">(SOLD OUT)</span>' : ''}</h3>
                        <p>₹${item.price} | ${item.prepTime} mins</p>
                        <button class="add-btn" 
                            ${isSoldOut ? 'disabled style="background:#888;"' : ''} 
                            onclick="addToCart('${doc.id}', '${item.name}', ${item.price})">
                            ${isSoldOut ? "Out of Stock" : "Add to Cart"}
                        </button>
                    </div>
                </div>`;
        }
    });
});
// Search & Filter Listeners
const searchInput = document.getElementById('menu-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const activeBtn = document.querySelector('.filter-btn.active');
        const activeCategory = activeBtn ? activeBtn.innerText : "All";
        loadMenu(activeCategory, e.target.value);
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const currentSearch = document.getElementById('menu-search')?.value || "";
        loadMenu(e.target.innerText, currentSearch); 
    });
});

// ==========================================
// 4. CART & LOGOUT
// ==========================================
let cart = [];
// Function to show/hide QR code based on selection
window.toggleQR = () => {
    const method = document.getElementById('payment-method').value;
    const qrBox = document.getElementById('qr-container');
    if (qrBox) {
        qrBox.style.display = (method === 'online') ? 'block' : 'none';
    }
};
window.addToCart = (id, name, price) => {
    cart.push({ id, name, price });
    const cartBtn = document.getElementById('view-cart-btn');
    if (cartBtn) {
        cartBtn.innerText = `View My Cart (${cart.length})`;
        cartBtn.classList.add('cart-updated');
        setTimeout(() => cartBtn.classList.remove('cart-updated'), 500);
    }
};
// ==========================================
// NEW: PAYMENT & ORDER SUBMISSION
// ==========================================

// 1. Function to show/hide QR code based on selection
window.toggleQR = () => {
    const method = document.getElementById('payment-method').value;
    const qrBox = document.getElementById('qr-container');
    if (qrBox) {
        qrBox.style.display = (method === 'online') ? 'block' : 'none';
    }
};

// 2. The logic that makes the "Confirm Payment" button work
const placeOrderBtn = document.getElementById('place-order-btn');
if (placeOrderBtn) {
    placeOrderBtn.onclick = () => {
        // Validation: Is the cart empty?
        if (cart.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        // Get the payment choice from the dropdown
        const selectedMethod = document.getElementById('payment-method').value;

        // Prepare the order data for Firebase
        const orderData = {
            customerEmail: auth.currentUser.email,
            items: cart.map(item => item.name),
            total: document.getElementById('cart-total').innerText,
            paymentMethod: selectedMethod, 
            status: "Pending",
            token: Math.floor(1000 + Math.random() * 9000), // Generates token like 5821
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Send to Firebase "orders" collection
        db.collection("orders").add(orderData)
            .then(() => {
                const message = (selectedMethod === 'cash') 
                    ? "Order placed! Please pay at the counter." 
                    : "Order placed! Thank you for the online payment.";
                alert(message);
                
                cart = []; // Clear the cart
                window.location.href = "token.html"; // Move to token page
            })
            .catch((error) => {
                alert("Error: " + error.message);
            });
    };
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'logout-btn' || e.target.id === 'logout-btn-admin') {
        auth.signOut().then(() => {
            window.location.href = "index.html"; 
        });
    }
});
// Function to show the cart modal
const viewCartBtn = document.getElementById('view-cart-btn');
const checkoutModal = document.getElementById('checkout-modal');

if (viewCartBtn && checkoutModal) {
    viewCartBtn.addEventListener('click', () => {
        // Open the modal
        checkoutModal.style.display = 'block';
        // Refresh the items shown inside the modal
        renderCartItems(); 
    });
}

// Function to generate the list of items inside the modal
function renderCartItems() {
    const cartSummary = document.getElementById('cart-summary');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartSummary) return;

    cartSummary.innerHTML = ""; // Clear old list
    let total = 0;

    if (cart.length === 0) {
        cartSummary.innerHTML = "<p style='text-align:center;'>Your cart is empty!</p>";
    } else {
        cart.forEach((item, index) => {
            cartSummary.innerHTML += `
                <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                    <span>${item.name}</span>
                    <span>₹${item.price}</span>
                </div>`;
            total += item.price;
        });
    }
    
    if (cartTotal) cartTotal.innerText = total;
}

// ==========================================
// 5. ADMIN LOGIC
// ==========================================
const addItemForm = document.getElementById('add-item-form');
if (addItemForm) {
    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newItem = {
            name: document.getElementById('item-name').value,
            price: Number(document.getElementById('item-price').value),
            prepTime: Number(document.getElementById('item-preptime').value),
            category: document.getElementById('item-category').value,
            isPopular: document.getElementById('item-popular') ? document.getElementById('item-popular').checked : false,
            imageURL: document.getElementById('item-image-url') ? document.getElementById('item-image-url').value : "",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        db.collection("menuItems").add(newItem).then(() => {
            alert("Added!");
            addItemForm.reset();
        });
    });
}

// Admin Tab Switching
const menuTab = document.getElementById('admin-menu-tab');
const ordersTab = document.getElementById('admin-orders-tab');
const menuPanel = document.getElementById('menu-panel');
const ordersPanel = document.getElementById('orders-panel');

if (menuTab && ordersTab) {
    ordersTab.addEventListener('click', () => {
        menuPanel.style.display = 'none';
        ordersPanel.style.display = 'block';
        ordersTab.classList.add('active');
        menuTab.classList.remove('active');
        loadAdminOrders();
    });

    menuTab.addEventListener('click', () => {
        menuPanel.style.display = 'block';
        ordersPanel.style.display = 'none';
        menuTab.classList.add('active');
        ordersTab.classList.remove('active');
    });
}

function loadAdminOrders() {
    const list = document.getElementById('admin-orders-list');
    if (!list) return;
    db.collection("orders").orderBy("timestamp", "desc").onSnapshot(snap => {
        list.innerHTML = snap.empty ? "<p>No orders yet...</p>" : ""; 
        snap.forEach(doc => {
            const order = doc.data();
            list.innerHTML += `
                <div class="order-card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: white;">
                    <strong>Token #${order.token}</strong> - ${order.status}
                    <p>Items: ${order.items.join(", ")}</p>
                    <button onclick="updateStatus('${doc.id}', 'Preparing')">Preparing</button>
                    <button onclick="updateStatus('${doc.id}', 'Ready')">Ready</button>
                </div>`;
        });
    });
}

window.updateStatus = (id, newStatus) => {
    db.collection("orders").doc(id).update({ status: newStatus });
};

// Updated Admin Menu List with CSS classes
function loadAdminMenuList() {
    const adminList = document.getElementById('admin-menu-list');
    if (!adminList) return;

    db.collection("menuItems").onSnapshot(snap => {
        adminList.innerHTML = "<h3>Current Menu Items</h3>";
        snap.forEach(doc => {
            const item = doc.data();
            const status = item.status || 'Available';
            
            // This turns "Sold Out" -> "sold-out" to match your CSS
            const statusClass = status.toLowerCase().replace(" ", "-");

            adminList.innerHTML += `
                <div class="admin-item-card">
                    <div class="item-info">
                        <strong>${item.name}</strong>
                        <span>₹${item.price}</span>
                    </div>
                    <button class="status-toggle-btn ${statusClass}" 
                            onclick="toggleAvailability('${doc.id}', '${status}')">
                        ${status}
                    </button>
                </div>`;
        });
    });
}

window.toggleAvailability = (id, currentStatus) => {
    const newStatus = (currentStatus === "Sold Out") ? "Available" : "Sold Out";
    db.collection("menuItems").doc(id).update({ status: newStatus })
    .then(() => console.log("Status updated to:", newStatus))
    .catch(err => alert("Error updating status: " + err.message));
};
// ==========================================
// 6. ORDER TRACKING UI
// ==========================================
function updateStatusUI(status) {
    const message = document.getElementById('token-message');
    if (!message) return;
    const stepPlaced = document.getElementById('step-placed');
    const stepPrep = document.getElementById('step-preparing');
    const stepReady = document.getElementById('step-ready');

    [stepPlaced, stepPrep, stepReady].forEach(el => el && (el.className = 'step'));

    if (status === "Pending") {
        stepPlaced?.classList.add('done');
        message.innerText = "Order Received!";
    } else if (status === "Preparing") {
        stepPlaced?.classList.add('done');
        stepPrep?.classList.add('done');
        message.innerText = "Cooking...";
    } else if (status === "Ready") {
        [stepPlaced, stepPrep, stepReady].forEach(el => el?.classList.add('done'));
        message.innerText = "Collect your food!";
    }
}


// NEW: Real-time Queue Status Listener
function startQueueListener() {
    const queueElement = document.getElementById('queue-count');
    if (!queueElement) return;

    db.collection("orders")
        .where("status", "in", ["Pending", "Preparing"])
        .onSnapshot((snapshot) => {
            queueElement.innerText = snapshot.size; 
        });
}
// ==========================================
// 7. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('menu-grid')) {
        loadMenu();
        startQueueListener(); // This must be INSIDE the brackets
    }
    
    if (document.getElementById('admin-menu-list')) {
        loadAdminMenuList();
    }
}); 
