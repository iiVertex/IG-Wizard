// Add a simple hover effect for cards
const cards = document.querySelectorAll('.card');
cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
        card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.3)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    });
});

// Mobile menu toggle
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden');
    }
});

// Add this to your existing script section
const mobilePapersDropdown = document.getElementById('mobile-papers-dropdown');
const mobilePapersMenu = document.getElementById('mobile-papers-menu');

if (mobilePapersDropdown) {
    mobilePapersDropdown.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the click from closing the menu immediately
        mobilePapersMenu.classList.toggle('hidden');
    });
    
    // Prevent clicks inside the dropdown from closing the mobile menu
    mobilePapersMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}
// Add hover effects for paper links
document.querySelectorAll('.paper-link').forEach(link => {
    link.addEventListener('mouseenter', () => {
        link.classList.add('bg-opacity-20', 'bg-blue-500');
    });
    link.addEventListener('mouseleave', () => {
        link.classList.remove('bg-opacity-20', 'bg-blue-500');
    });
});
document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // You would typically send the form data to your server here
    // For now, we'll just show a success message
    
    const name = document.getElementById('name').value;
    alert(`Thanks for reaching out, ${name}! We'll get back to you soon.`);
    
    // Reset the form
    this.reset();
});