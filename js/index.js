// Publication filtering functions
function filterPublications(mode) {
    const items = document.querySelectorAll('.publication-item');
    const filterLinks = document.querySelectorAll('.filter-link');
    const topicLinks = document.querySelectorAll('.topic-link');

    // Update active filter link
    filterLinks.forEach(link => {
        link.classList.remove('is-active');
        if (link.dataset.filter === mode) {
            link.classList.add('is-active');
        }
    });

    // Reset topic links
    topicLinks.forEach(link => link.classList.remove('is-active'));

    items.forEach(item => {
        if (mode === 'all') {
            item.style.setProperty('display', 'block', 'important');
        } else if (mode === 'selected') {
            // Show only featured/selected publications (first 3)
            const index = Array.from(items).indexOf(item);
            item.style.setProperty('display', index < 3 ? 'block' : 'none', 'important');
        } else if (mode === 'topic') {
            item.style.setProperty('display', 'block', 'important');
        }
    });

    console.log(`Filter mode: ${mode}`);
}

function filterByTopic(topic) {
    const items = document.querySelectorAll('.publication-item');
    const topicLinks = document.querySelectorAll('.topic-link');
    const filterLinks = document.querySelectorAll('.filter-link');

    // Update active topic link
    topicLinks.forEach(link => {
        link.classList.remove('is-active');
        if (link.dataset.topic === topic) {
            link.classList.add('is-active');
        }
    });

    // Update filter links (activate "show by topic")
    filterLinks.forEach(link => {
        link.classList.remove('is-active');
        if (link.dataset.filter === 'topic') {
            link.classList.add('is-active');
        }
    });

    // Filter publications by topic
    let visibleCount = 0;
    items.forEach(item => {
        const topicsStr = (item.dataset.topics || '').trim();
        const topicsArray = topicsStr.split(/\s+/);

        if (topicsArray.includes(topic)) {
            item.style.setProperty('display', 'block', 'important');
            visibleCount++;
        } else {
            item.style.setProperty('display', 'none', 'important');
        }
    });

    console.log(`Filtered by ${topic}: ${visibleCount} publications visible`);

    // Smooth scroll to publications section
    const pubSection = document.getElementById('publications');
    if (pubSection) {
        pubSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Project filtering functions
function filterProjects(mode) {
    const items = document.querySelectorAll('.project-item');
    const filterLinks = document.querySelectorAll('.project-filter-link');
    const topicLinks = document.querySelectorAll('.project-topic-link');

    // Update active filter link
    filterLinks.forEach(link => {
        link.classList.remove('is-active');
        if (link.dataset.filter === mode) {
            link.classList.add('is-active');
        }
    });

    // Reset topic links
    topicLinks.forEach(link => link.classList.remove('is-active'));

    items.forEach(item => {
        if (mode === 'all') {
            item.style.setProperty('display', 'block', 'important');
        } else if (mode === 'selected') {
            // Show only featured/selected projects (first 5)
            const index = Array.from(items).indexOf(item);
            item.style.setProperty('display', index < 5 ? 'block' : 'none', 'important');
        } else if (mode === 'topic') {
            item.style.setProperty('display', 'block', 'important');
        }
    });

    console.log(`Project filter mode: ${mode}`);
}

function filterProjectByTopic(topic) {
    const items = document.querySelectorAll('.project-item');
    const topicLinks = document.querySelectorAll('.project-topic-link');
    const filterLinks = document.querySelectorAll('.project-filter-link');

    // Update active topic link
    topicLinks.forEach(link => {
        link.classList.remove('is-active');
        if (link.dataset.topic === topic) {
            link.classList.add('is-active');
        }
    });

    // Update filter links (activate "show by topic")
    filterLinks.forEach(link => {
        link.classList.remove('is-active');
        if (link.dataset.filter === 'topic') {
            link.classList.add('is-active');
        }
    });

    // Filter projects by topic
    let visibleCount = 0;
    items.forEach(item => {
        const topicsStr = (item.dataset.topics || '').trim();
        const topicsArray = topicsStr.split(/\s+/);

        if (topicsArray.includes(topic)) {
            item.style.setProperty('display', 'block', 'important');
            visibleCount++;
        } else {
            item.style.setProperty('display', 'none', 'important');
        }
    });

    console.log(`Filtered projects by ${topic}: ${visibleCount} projects visible`);

    // Smooth scroll to projects section
    const projSection = document.getElementById('projects');
    if (projSection) {
        projSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

$(document).ready(function() {
    $('.publication-mousecell').mouseover(function() {
        $(this).find('video').css('display', 'inline-block');
        // order of the next two lines matters
        $(this).find('img').css('display', 'none');
        $(this).find('.image2').css('display', 'inline-block');
    });
    $('.publication-mousecell').mouseout(function() {
        $(this).find('video').css('display', 'none');
        // order of the next two lines matters
        $(this).find('img').css('display', 'inline-block');
        $(this).find('.image2').css('display', 'none');

    });

    $('.publication-mousecell').on('touchend', function() {
        $(this).find('video').css('display', 'none');
        // order of the next two lines matters
        $(this).find('img').css('display', 'inline-block');
        $(this).find('.image2').css('display', 'none');

    });

    $('.publication-mousecell').on('touchstart touchcancel touchmove', function() {
        $(this).find('video').css('display', 'inline-block');
        // order of the next two lines matters
        $(this).find('img').css('display', 'none');
        $(this).find('.image2').css('display', 'inline-block');
    });

})

// fix from https://stackoverflow.com/questions/58146137/closing-a-dropdown-navbar-on-click-in-javascript
document.addEventListener('DOMContentLoaded', () => {
    const navbarBurgers = document.querySelectorAll('.navbar-burger');
    const navbarItems = document.querySelectorAll(".navbar-item");

    navbarBurgers.forEach(burger_el => {
        burger_el.addEventListener('click', (event) => {
            // Toggle burger-menu
            document.getElementById(burger_el.dataset.target).classList.toggle('is-active');
            event.target.classList.toggle('is-active');
        });
        navbarItems.forEach(item => {
            item.addEventListener("click", (event) => {
                // Close burger-menu
                document.getElementById(burger_el.dataset.target).classList.remove('is-active');
                event.target.classList.remove('is-active');
            });
        });
    });

    // Open all links in a separate tab, excluding anchor links on the same page
    var links = document.links;
    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href");
        // Check if the href starts with "#" or is an anchor to the current page
        if (href && !href.startsWith("#") && !href.startsWith(window.location.pathname + "#")) {
            links[i].target = "_blank";
        }
    }
});


// --- Announcement bar + promo modal (added 2026-06-12, config in _data/) ---
document.addEventListener('DOMContentLoaded', () => {
    var bar = document.getElementById('announcement-bar');
    if (bar) {
        var announceId = bar.dataset.announceId;
        if (localStorage.getItem('announce-dismissed') !== announceId) {
            bar.style.display = 'flex';
        }
        var closeBtn = document.getElementById('announcement-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                localStorage.setItem('announce-dismissed', announceId);
                bar.style.display = 'none';
            });
        }
    }

    var modal = document.getElementById('promo-modal');
    if (modal) {
        var popupId = modal.dataset.popupId;
        var delayMs = parseInt(modal.dataset.delayMs || '8000', 10);
        var cooldownDays = parseInt(modal.dataset.cooldownDays || '30', 10);
        var storageKey = 'promo-last-shown-' + popupId;
        var last = parseInt(localStorage.getItem(storageKey) || '0', 10);
        var elapsedDays = (Date.now() - last) / 86400000;
        var hide = function () { modal.classList.remove('is-active'); };
        if (!last || elapsedDays >= cooldownDays) {
            setTimeout(function () {
                modal.classList.add('is-active');
                localStorage.setItem(storageKey, String(Date.now()));
            }, delayMs);
        }
        modal.querySelector('.delete').addEventListener('click', hide);
        modal.querySelector('.modal-background').addEventListener('click', hide);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    }
});
