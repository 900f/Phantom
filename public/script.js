console.log('script.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    // DOM elements
    const boostersList = document.getElementById('boosters-list');
    const orderForm = document.getElementById('order-form');
    const currentRankSelect = document.getElementById('current-rank');
    const desiredRankSelect = document.getElementById('desired-rank');
    const boosterSelect = document.getElementById('booster');
    const priorityCheckbox = document.getElementById('priority');
    const summaryService = document.getElementById('summary-service');
    const summaryBasePrice = document.getElementById('summary-base-price');
    const summaryPriority = document.getElementById('summary-priority');
    const summaryTotal = document.getElementById('summary-total');
    const successModal = document.getElementById('success-modal');
    const orderIdSpan = document.getElementById('order-id');
    const discordLink = document.getElementById('discord-link');
    const invoiceInput = document.getElementById('invoice-id');
    const termsCheckbox = document.getElementById('terms');

    // Pricing configuration
    const prices = {
        'Bronze → Champion': 20,
        'Silver → Champion': 20,
        'Gold → Champion': 20,
        'Platinum → Champion': 15,
        'Emerald → Champion': 10,
        'Diamond → Champion': 5
    };

    // Update booster status list display
    socket.on('boosters_update', (boosters) => {
        console.log('Received boosters update:', boosters);
        updateBoostersDisplay(boosters);
        updateBoosterSelect(boosters);
        updateSummary();
        updatePlaceOrderState();
    });

    function updateBoostersDisplay(boosters) {
        if (!boostersList) {
            console.warn('boostersList element not found');
            return;
        }

        boostersList.innerHTML = '';

        if (!boosters || boosters.length === 0) {
            boostersList.innerHTML = `
                <div class="booster-row">
                    <div style="grid-column: 1/-1; text-align: center; color: #666;">
                        No boosters available at the moment
                    </div>
                </div>
            `;
            return;
        }

        boosters.forEach(booster => {
            const row = document.createElement('div');
            row.className = 'booster-row';

            const statusClass = (booster.status || 'Unknown').toLowerCase().replace(/\s/g, '');
            const statusText = booster.status || 'Unknown';
            const statusSymbol = statusText === 'Available' ? '' : ' ✗';

            row.innerHTML = `
                <div>${booster.name || 'Unknown'}</div>
                <div>${booster.rank || 'Unknown'}</div>
                <div><span class="status ${statusClass}">${statusText}${statusSymbol}</span></div>
            `;

            boostersList.appendChild(row);
        });
    }

    function updateBoosterSelect(boosters) {
        if (!boosterSelect) {
            console.warn('boosterSelect element not found');
            return;
        }

        const selectedBooster = boosterSelect.value;
        boosterSelect.innerHTML = '<option value="" disabled>Select a Booster</option>';

        if (!boosters || boosters.length === 0) {
            return;
        }

        boosters.forEach(booster => {
            const option = document.createElement('option');
            option.value = booster.name;
            option.textContent = `${booster.name} - ${booster.status || 'Unknown'}${booster.status !== 'Available' ? ' ✗' : ''}`;
            option.disabled = booster.status !== 'Available';
            if (booster.name === selectedBooster) {
                option.selected = true;
            }
            boosterSelect.appendChild(option);
        });
    }

    function updateSummary() {
        if (!currentRankSelect || !desiredRankSelect || !summaryService || !summaryBasePrice || !summaryPriority || !summaryTotal || !priorityCheckbox) {
            console.warn('One or more summary elements not found');
            return;
        }

        const currentRank = currentRankSelect.value;
        const desiredRank = desiredRankSelect.value;
        const priority = priorityCheckbox.checked;

        if (currentRank && desiredRank) {
            const rankCombo = `${currentRank} → ${desiredRank}`;
            const basePrice = prices[rankCombo] || 0;
            const priorityPrice = priority ? 5 : 0;
            const totalPrice = basePrice + priorityPrice;

            summaryService.textContent = rankCombo;
            summaryBasePrice.textContent = `£${basePrice.toFixed(2)}`;
            summaryPriority.textContent = `£${priorityPrice.toFixed(2)}`;
            summaryTotal.textContent = `£${totalPrice.toFixed(2)}`;
        } else {
            summaryService.textContent = 'Select ranks first';
            summaryBasePrice.textContent = '£0.00';
            summaryPriority.textContent = '£0.00';
            summaryTotal.textContent = '£0.00';
        }
    }

    function updatePlaceOrderState() {
        if (!orderForm) {
            console.warn('orderForm element not found');
            return;
        }

        const submitButton = orderForm.querySelector('button[type="submit"]');
        if (!submitButton) {
            console.warn('Submit button not found');
            return;
        }

        const invoiceFilled = invoiceInput && invoiceInput.value.trim() !== '';
        const termsChecked = termsCheckbox && termsCheckbox.checked;

        submitButton.disabled = !(invoiceFilled && termsChecked);
        submitButton.classList.toggle('btn-disabled', !(invoiceFilled && termsChecked));
    }

    // Event listeners for form inputs
    if (invoiceInput) {
        invoiceInput.addEventListener('input', updatePlaceOrderState);
    }
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', updatePlaceOrderState);
    }
    if (currentRankSelect) {
        currentRankSelect.addEventListener('change', () => {
            updateSummary();
            updatePlaceOrderState();
        });
    }
    if (desiredRankSelect) {
        desiredRankSelect.addEventListener('change', () => {
            updateSummary();
            updatePlaceOrderState();
        });
    }
    if (priorityCheckbox) {
        priorityCheckbox.addEventListener('change', () => {
            updateSummary();
            updatePlaceOrderState();
        });
    }

    // Form submission handler
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Submit button clicked');

            const username = orderForm.querySelector('#username')?.value.trim();
            const discord = orderForm.querySelector('#discord')?.value.trim();
            const invoiceId = invoiceInput?.value.trim();
            const terms = termsCheckbox?.checked;

            // Validation
            if (!currentRankSelect.value) {
                alert('Please select your current rank.');
                return;
            }
            if (!desiredRankSelect.value) {
                alert('Please select your desired rank.');
                return;
            }
            if (!boosterSelect.value) {
                alert('Please select a booster.');
                return;
            }
            if (!username) {
                alert('Please enter your R6 username.');
                return;
            }
            if (!discord) {
                alert('Please enter your Discord username.');
                return;
            }
            if (!invoiceId) {
                alert('Please enter your PayPal Invoice ID.');
                return;
            }
            if (!terms) {
                alert('Please agree to the terms and conditions.');
                return;
            }

            const submitButton = orderForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            try {
                const response = await fetch('/api/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        currentRank: currentRankSelect.value,
                        desiredRank: desiredRankSelect.value,
                        addons: [],
                        username,
                        discord,
                        priority: priorityCheckbox.checked,
                        invoiceId,
                        booster: boosterSelect.value
                    })
                });

                const data = await response.json();
                console.log('Order response:', data);

                if (data.success) {
                    orderIdSpan.textContent = data.orderId || 'Unknown';
                    discordLink.href = data.discordInvite || 'https://discord.com';
                    if (successModal) {
                        successModal.style.display = 'flex';
                    }
                    orderForm.reset();
                    updateSummary();
                    updatePlaceOrderState();
                } else {
                    alert(data.error || 'Failed to place order');
                }
            } catch (error) {
                console.error('Order submission failed:', error);
                alert('An error occurred while placing your order.');
            } finally {
                submitButton.textContent = 'Place Order';
                submitButton.disabled = false;
            }
        });
    } else {
        console.warn('Order form element not found');
    }

    // Close modal
    window.closeModal = function() {
        if (successModal) {
            successModal.style.display = 'none';
        }
    };

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Header background on scroll
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (header) {
            header.style.background = window.scrollY > 100 
                ? 'rgba(10, 10, 26, 0.98)' 
                : 'rgba(10, 10, 26, 0.95)';
        }
    });

    // Initial fetch boosters
    fetch('/api/boosters')
        .then(res => {
            if (!res.ok) {
                console.error('Failed to fetch boosters, status:', res.status);
                throw new Error('Failed to fetch boosters');
            }
            return res.json();
        })
        .then(boosters => {
            console.log('Fetched boosters from API:', boosters);
            updateBoostersDisplay(boosters);
            updateBoosterSelect(boosters);
            updateSummary();
            updatePlaceOrderState();
        })
        .catch(error => {
            console.error('Failed to load boosters:', error);
            updateBoostersDisplay([]);
            updateBoosterSelect([]);
        });

    // Animate fade-in for sections
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.pricing-card, .form-step, .about-text').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Button loading state
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.type === 'submit' || this.classList.contains('btn-disabled')) return;

            const originalText = this.textContent;
            this.textContent = 'Loading...';
            this.disabled = true;

            setTimeout(() => {
                this.textContent = originalText;
                this.disabled = false;
            }, 2000);
        });
    });
});