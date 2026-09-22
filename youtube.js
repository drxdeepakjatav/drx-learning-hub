// ==========================================
// DRx Learning Hub
// YouTube Latest Videos
// ==========================================


// IMPORTANT:
// Replace these two values with your own
// YouTube API Key and Channel ID.

const API_KEY = "YOUR_YOUTUBE_API_KEY";

const CHANNEL_ID = "YOUR_CHANNEL_ID";


// Number of videos

const MAX_RESULTS = 6;


// YouTube API URL

const API_URL =
    "https://www.googleapis.com/youtube/v3/search";


async function loadLatestVideos() {

    const container =
        document.getElementById("youtube-videos");


    if (!container) {
        return;
    }


    // If API key is not configured

    if (
        API_KEY === "YOUR_YOUTUBE_API_KEY" ||
        CHANNEL_ID === "YOUR_CHANNEL_ID"
    ) {

        container.innerHTML = `

            <div class="loading">

                <p>
                    YouTube videos will appear here
                    after API configuration.
                </p>

            </div>

        `;

        return;
    }


    try {

        const url =
            `${API_URL}?` +
            `key=${API_KEY}` +
            `&channelId=${CHANNEL_ID}` +
            `&part=snippet` +
            `&order=date` +
            `&maxResults=${MAX_RESULTS}` +
            `&type=video`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "YouTube API request failed"
            );

        }


        const data =
            await response.json();


        if (!data.items || data.items.length === 0) {

            container.innerHTML = `

                <div class="loading">

                    No videos found.

                </div>

            `;

            return;
        }


        container.innerHTML = "";


        data.items.forEach(video => {

            const videoId =
                video.id.videoId;


            const title =
                video.snippet.title;


            const thumbnail =
                video.snippet.thumbnails
                    .high.url;


            const publishedDate =
                new Date(
                    video.snippet.publishedAt
                ).toLocaleDateString(
                    "en-IN",
                    {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }
                );


            const card =
                document.createElement("div");


            card.className =
                "video-card";


            card.innerHTML = `

                <a
                    href="https://www.youtube.com/watch?v=${videoId}"
                    target="_blank"
                    rel="noopener noreferrer"
                >

                    <img
                        src="${thumbnail}"
                        alt="${title}"
                        class="video-thumbnail"
                        loading="lazy"
                    >

                </a>


                <div class="video-info">

                    <h3>
                        ${title}
                    </h3>

                    <div class="video-date">
                        Published:
                        ${publishedDate}
                    </div>

                </div>

            `;


            container.appendChild(card);

        });


    } catch (error) {

        console.error(
            "YouTube Error:",
            error
        );


        container.innerHTML = `

            <div class="loading">

                <p>
                    Unable to load YouTube videos.
                </p>

                <a
                    href="https://www.youtube.com/@drxdeepakjatav"
                    target="_blank"
                    class="btn primary-btn"
                >
                    Visit YouTube Channel
                </a>

            </div>

        `;

    }

}


// Start

loadLatestVideos();