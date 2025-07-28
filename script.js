import { gsap } from "gsap";

const creatorInfoEl = document.getElementById('creator-info');
const creatorLinkEl = document.getElementById('creator-link');
const creatorAvatarEl = document.getElementById('creator-avatar');
const creatorUsernameEl = document.getElementById('creator-username');
const loaderEl = document.getElementById('loader');
const resultsEl = document.getElementById('results');
const insightsContainerEl = document.getElementById('insights-container');
const errorMessageEl = document.getElementById('error-message');

async function getCreatorProjects(username) {
    try {
        const response = await fetch(`/api/v1/users/${username}/projects?posted=true&first=10`);
        if (!response.ok) {
            console.error('Failed to fetch projects');
            return [];
        }
        const data = await response.json();
        return data.projects.data.map(p => ({
            title: p.project.title,
            description: p.project.description,
            stats: p.project.stats,
        }));
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
}

function displayInsights(insights) {
    insightsContainerEl.innerHTML = '';
    if (!insights || insights.length === 0) {
        errorMessageEl.classList.remove('hidden');
        return;
    }
    
    insights.forEach(insight => {
        const card = document.createElement('div');
        card.className = 'insight-card';
        card.innerHTML = `
            <h3>${insight.title}</h3>
            <p>${insight.text}</p>
        `;
        insightsContainerEl.appendChild(card);
    });

    gsap.to(".insight-card", {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.2,
        ease: "power2.out"
    });
}

async function generateInsights(creator, projects) {
    const projectData = projects.map(p => `Title: ${p.title || 'Untitled'}\nDescription: ${p.description || 'N/A'}\nViews: ${p.stats.views}, Likes: ${p.stats.likes}`).join('\n---\n');

    const systemPrompt = `You are an AI business consultant with a deadpan, absurdly specific, and slightly awkward persona, inspired by Nathan Fielder. Your name is "The Strategist". You analyze a creative person's portfolio and generate "actionable insights". Your advice should be technically logical but socially bizarre or over-engineered. Frame mundane observations as profound discoveries. Respond ONLY with a JSON object following this schema: { "insights": [{ "title": "Insight Title", "text": "Insight text." }] }. Do not add any other text.`;

    const userPrompt = `Analyze the following project portfolio for creator "${creator.username}". Provide three distinct, actionable insights based on the data. Focus on identifying unusual patterns and proposing unconventional strategies for growth.\n\nPortfolio Data:\n${projectData}`;

    try {
        const completion = await websim.chat.completions.create({
            messages: [{
                role: "system",
                content: systemPrompt
            }, {
                role: "user",
                content: userPrompt
            }, ],
            json: true,
        });

        const result = JSON.parse(completion.content);
        return result.insights;
    } catch (error) {
        console.error('AI generation failed:', error);
        return [];
    }
}

async function main() {
    const creator = await window.websim.getCreator();
    if (!creator) {
        loaderEl.innerHTML = '<p>No creator found for this page.</p>';
        return;
    }
    
    creatorAvatarEl.src = creator.avatar_url || `https://images.websim.com/avatar/${creator.username}`;
    creatorUsernameEl.textContent = `@${creator.username}`;
    creatorLinkEl.href = `https://websim.com/@${creator.username}`;
    creatorInfoEl.classList.remove('hidden');

    const projects = await getCreatorProjects(creator.username);
    
    if (projects.length === 0) {
         loaderEl.classList.add('hidden');
         resultsEl.classList.remove('hidden');
         errorMessageEl.classList.remove('hidden');
         errorMessageEl.innerHTML = `<p>Analysis terminated. The creator @${creator.username} has no public projects, a bold strategy of digital minimalism. My recommendation is to create something. Anything.</p>`;
         return;
    }
    
    const insights = await generateInsights(creator, projects);

    loaderEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');
    displayInsights(insights);
}

main();

