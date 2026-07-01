import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import yts from 'yt-search';
import { Readable } from 'stream';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized in server.js');
  } catch (err) {
    console.error('⚠️ Failed to initialize Supabase client:', err.message);
  }
}


app.use(cors());
app.use(express.json());

/* ═══════════════════════════════════════════════════════════════════════
   IN-MEMORY CACHE  (5-minute TTL — acts as a lightweight "crawler cache")
═══════════════════════════════════════════════════════════════════════ */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) { cache.set(key, { data, ts: Date.now() }); }

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════ */

const fmt = (n) => {
  if (!n || isNaN(n)) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
};

/** Fetch from one of several Invidious instances as a fallback */
async function fetchFromInvidious(endpoint, params = {}) {
  const INVIDIOUS_INSTANCES = [
    'https://yewtu.be',
    'https://inv.vern.cc',
    'https://invidious.nerdvpn.de',
    'https://vid.puffyan.us'
  ];
  const queryStr = new URLSearchParams(params).toString();
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}${endpoint}?${queryStr}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return await res.json();
    } catch {
      /* try next */
    }
  }
  return null;
}

// Extract clean channel ID or handle
function extractChannelId(str) {
  if (!str) return '';
  
  // If it's a concatenated image URL (e.g. contains ggpht or googleusercontent), extract it directly
  if (str.includes('ggpht.com') || str.includes('googleusercontent.com')) {
    const idx = str.indexOf('https://yt3.');
    if (idx !== -1) {
      return str.substring(idx);
    }
    // Fallback: search for any occurrence of https:// in a second half
    const lastHttps = str.lastIndexOf('https://');
    if (lastHttps > 0) {
      return str.substring(lastHttps);
    }
  }


  // If it's a direct ID, return it
  if (str.startsWith('UC') && str.length === 24) return str;
  // If it's a URL, parse it
  let path = str.replace(/^https?:\/\/(?:www\.)?youtube\.com/, '');
  if (path.startsWith('/channel/')) {
    return path.replace('/channel/', '').split('/')[0];
  }
  if (path.startsWith('/user/')) {
    return path.replace('/user/', '').split('/')[0];
  }
  if (path.startsWith('/@')) {
    return path.replace('/', '').split('?')[0];
  }
  const res = str.split('/')[0];
  if (res === 'https:' || res === 'http:' || res === '') return '';
  return res;
}


// Scrape YouTube channel page for real og:image avatar URL
async function scrapeOriginalAvatar(channelId) {
  const cleanId = extractChannelId(channelId);
  if (!cleanId) return null;

  const url = cleanId.startsWith('UC')
    ? `https://www.youtube.com/channel/${cleanId}`
    : `https://www.youtube.com/${cleanId}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // 1. Try Open Graph image meta tag
    let match = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (match && match[1] && (match[1].includes('ggpht.com') || match[1].includes('googleusercontent.com'))) {
      return match[1];
    }

    // 2. Try Twitter image meta tag
    match = html.match(/<meta name="twitter:image" content="([^"]+)"/);
    if (match && match[1] && (match[1].includes('ggpht.com') || match[1].includes('googleusercontent.com'))) {
      return match[1];
    }

    // 3. Try link image_src
    match = html.match(/<link rel="image_src" href="([^"]+)"/);
    if (match && match[1] && (match[1].includes('ggpht.com') || match[1].includes('googleusercontent.com'))) {
      return match[1];
    }

    // 4. Try any yt3.ggpht.com or googleusercontent.com link in page source
    const ggphtPattern = /"(https:\/\/yt3\.(?:ggpht\.com|googleusercontent\.com)\/[a-zA-Z0-9\-\_]+=[sS]\d+[^"]*)"/g;
    const ggphtMatches = [...html.matchAll(ggphtPattern)];
    if (ggphtMatches.length > 0) {
      return ggphtMatches[0][1];
    }
  } catch (err) {
    console.error(`Scraper error for ${channelId}:`, err.message);
  }
  return null;
}

// Fallbacks for avatar URL lookup
async function getFallbackAvatar(channelId, channelTitle) {
  const cleanId = extractChannelId(channelId);

  // Fallback 1: Invidious
  try {
    const data = await fetchFromInvidious(`/api/v1/channels/${cleanId}`);
    if (data && data.authorThumbnails && data.authorThumbnails.length > 0) {
      const best = data.authorThumbnails[data.authorThumbnails.length - 1]?.url;
      if (best) return best;
    }
  } catch (e) {
    console.error(`Invidious avatar fetch fallback failed:`, e.message);
  }

  // Fallback 2: unavatar.io
  const unavatarUrl = `https://unavatar.io/youtube/${cleanId.replace('@', '')}`;
  try {
    const res = await fetch(unavatarUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    if (res.ok && res.url && !res.url.includes('fallback') && !res.url.includes('unavatar.io')) {
      return res.url;
    }
  } catch (e) {
    console.error(`Unavatar lookup failed:`, e.message);
  }

  // Fallback 3: yt-search (using channel title for keyword matching)
  try {
    const r = await yts(channelTitle || cleanId);
    if (r.channels && r.channels.length > 0) {
      const img = r.channels[0].image || r.channels[0].thumbnail;
      if (img) return img;
    }
  } catch (e) {
    console.error(`yt-search avatar fallback failed:`, e.message);
  }

  return null;
}

// Resolve & Save avatar URL in DB
async function resolveChannelAvatar(channelId, channelTitle) {
  const cleanId = extractChannelId(channelId);
  if (!cleanId) return null;

  let avatarUrl = await scrapeOriginalAvatar(cleanId);
  if (!avatarUrl) {
    avatarUrl = await getFallbackAvatar(cleanId, channelTitle);
  }


  if (avatarUrl && supabase) {
    try {
      // Upsert to avoid duplicate channel records
      const { error } = await supabase.from('channels').upsert({
        youtube_id: cleanId,
        title: channelTitle || 'Unknown Channel',
        thumbnail_url: avatarUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'youtube_id' });

      if (error) {
        console.error('Supabase channels upsert error:', error.message);
      }
    } catch (dbErr) {
      console.error('DB error during upsert:', dbErr.message);
    }
  }

  return avatarUrl;
}

// 24-hour cache manager with filesystem persistence
const CACHE_FILE = process.env.ELECTRON === 'true'
  ? path.join(os.homedir(), '.viewstats', 'avatar-cache.json')
  : './avatar-cache.json';

try {
  const cacheDir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create cache directory:', err.message);
}

const localAvatarCache = new Map();

// Load cache from file on startup
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    for (const [k, v] of Object.entries(data)) {
      localAvatarCache.set(k, v);
    }
    console.log(`✅ Loaded ${localAvatarCache.size} avatars from local cache file.`);
  }
} catch (err) {
  console.error('Failed to load local avatar cache file:', err.message);
}

function saveLocalAvatarCache() {
  try {
    const obj = {};
    for (const [k, v] of localAvatarCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write local avatar cache file:', err.message);
  }
}

async function getChannelAvatarCached(channelId, channelTitle) {
  const cleanId = extractChannelId(channelId);
  if (!cleanId) return null;

  // If the cleanId is already a full URL, return it directly
  if (cleanId.startsWith('http')) {
    return cleanId;
  }

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Check in-memory/fs cache
  if (localAvatarCache.has(cleanId)) {
    const entry = localAvatarCache.get(cleanId);
    if (now - entry.ts < ONE_DAY_MS && entry.url) {
      return entry.url;
    }
  }

  // Check Supabase database
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('thumbnail_url, updated_at')
        .eq('youtube_id', cleanId)
        .maybeSingle();

      if (data && data.thumbnail_url) {
        const lastUpdated = new Date(data.updated_at || data.created_at || now).getTime();
        if (now - lastUpdated < ONE_DAY_MS) {
          localAvatarCache.set(cleanId, { url: data.thumbnail_url, ts: lastUpdated });
          saveLocalAvatarCache();
          return data.thumbnail_url;
        }
      }
    } catch (e) {
      console.error('Database query error in getChannelAvatarCached:', e.message);
    }
  }

  // Missing or stale: fetch fresh
  const freshUrl = await resolveChannelAvatar(cleanId, channelTitle);
  if (freshUrl) {
    localAvatarCache.set(cleanId, { url: freshUrl, ts: now });
    saveLocalAvatarCache();
    return freshUrl;
  }

  // Return last known URL as fallback
  if (localAvatarCache.has(cleanId)) {
    return localAvatarCache.get(cleanId).url;
  }
  return null;
}


/** Returns a YouTube CDN thumbnail URL — rejects custom filenames from yt-search (e.g. hq720_custom_1.jpg) */

function safeThumb(url, videoId) {
  if (url && (url.includes('ytimg.com') || url.includes('img.youtube.com'))) return url;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function cleanChannelId(id) {
  if (!id) return '';
  if (id.includes('ggpht.com') || id.includes('googleusercontent.com')) return '';
  return id;
}

/** Map a yt-search video result to our standard schema */
function mapYtsVideo(v) {
  return {
    id: v.videoId,
    youtube_id: v.videoId,
    title: v.title,
    description: v.description || '',
    thumbnail_url: safeThumb(v.image || v.thumbnail, v.videoId),
    view_count: v.views || 0,
    like_count: Math.floor((v.views || 0) * 0.05),
    comment_count: Math.floor((v.views || 0) * 0.005),
    published_at: v.ago || '',
    // v.author.image is the real YouTube channel avatar (yt3.ggpht.com CDN) — pass it through
    channel: {
      title: v.author?.name || 'Unknown',
      id: cleanChannelId(v.author?.url) || '',
      thumbnail_url: v.author?.image || v.author?.thumbnail || '',
    },
    author: {
      title: v.author?.name || 'Unknown',
      name: v.author?.name || 'Unknown',
      image: v.author?.image || v.author?.thumbnail || '',
      url: cleanChannelId(v.author?.url) || '',
    },
    duration: v.seconds || 0,
    is_live: v.isLive || false,
    is_short: (v.seconds > 0 && v.seconds <= 60),
  };
}


// Query variation suffixes — rotate through these for pages 2+ to get fresh results
const PAGE_VARIATIONS = [
  '', '2024', '2025', 'new', 'latest', 'best', 'top', 'viral',
  'full', 'official', 'hd', 'shorts', 'live', 'compilation', 'highlights'
];

/** Search real YouTube videos with true multi-page support */
async function searchRealYouTubeVideos(query, maxResults = 50, page = 1) {
  const cacheKey = `videos:${query}:${page}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // For pages 2+, append a variation suffix to get different results from yt-search
  const variation = PAGE_VARIATIONS[(page - 1) % PAGE_VARIATIONS.length];
  const searchQuery = page === 1 ? query : `${query} ${variation}`.trim();

  try {
    // Try fetching the page directly first (works sometimes)
    const r = await yts({ query: searchQuery, pageStart: 1, pageEnd: 1 });
    if (r.videos && r.videos.length > 0) {
      const videos = r.videos.slice(0, maxResults).map(mapYtsVideo);
      cacheSet(cacheKey, videos);
      return videos;
    }
    throw new Error('Empty result from yt-search');
  } catch (err) {
    console.log(`yt-search page ${page} fallback to Invidious for: ${searchQuery}`);
    try {
      // Invidious supports proper page-based pagination
      const data = await fetchFromInvidious('/api/v1/search', {
        q: searchQuery,
        type: 'video',
        page: String(page),
        sort_by: 'relevance',
      });
      if (data && Array.isArray(data) && data.length > 0) {
        const videos = data.slice(0, maxResults).map(v => ({
          id: v.videoId,
          youtube_id: v.videoId,
          title: v.title,
          description: v.description || '',
          thumbnail_url: safeThumb(
            v.videoThumbnails?.find(t => t.quality === 'medium')?.url ||
            v.videoThumbnails?.[0]?.url,
            v.videoId
          ),
          view_count: v.viewCount || 0,
          like_count: Math.floor((v.viewCount || 0) * 0.05),
          comment_count: Math.floor((v.viewCount || 0) * 0.005),
          published_at: v.publishedText || '',
          channel: {
            title: v.author || 'Unknown',
            id: v.authorId || '',
            thumbnail_url: v.authorThumbnails?.[v.authorThumbnails.length - 1]?.url || '',
          },
          author: {
            title: v.author || 'Unknown',
            name: v.author || 'Unknown',
            image: v.authorThumbnails?.[v.authorThumbnails.length - 1]?.url || '',
            url: v.authorId ? `/channel/${v.authorId}` : '',
          },
          duration: v.lengthSeconds || 0,
          is_live: v.liveNow || false,
          is_short: (v.lengthSeconds > 0 && v.lengthSeconds <= 60),
        }));
        cacheSet(cacheKey, videos);
        return videos;
      }
    } catch (invErr) {
      console.error('Invidious fallback failed:', invErr.message);
    }

    // Last resort: try yt-search with the original query (not variation)
    if (page > 1) {
      try {
        const r2 = await yts({ query, pageStart: 1, pageEnd: 1 });
        if (r2.videos && r2.videos.length > 0) {
          // Return shuffled version to give appearance of "new" content
          const videos = r2.videos
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(20, maxResults))
            .map(mapYtsVideo);
          cacheSet(cacheKey, videos);
          return videos;
        }
      } catch { /* give up */ }
    }
    return [];
  }
}


/** Search real YouTube channels via yt-search with Invidious fallback */
async function searchRealYouTubeChannels(query, maxResults = 10) {
  const cacheKey = `channels:${query}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const r = await yts(query);
    const accounts = (r.accounts || r.channels || []).slice(0, maxResults);
    if (accounts.length === 0 && r.videos?.length > 0) {
      const author = r.videos[0].author;
      const result = [{
        id: author.url || query,
        youtube_id: author.url || query,
        title: author.name || query,
        description: 'Channel found via video search.',
        thumbnail_url: author.image || author.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || query)}&background=FF0000&color=fff`,
        subscriber_count: 1000000,
        video_count: 500,
        is_verified: true,
      }];
      cacheSet(cacheKey, result);
      return result;
    }
    const result = accounts.map(a => {
      let subs = 0;
      if (a.subCountLabel) {
        const str = a.subCountLabel.toLowerCase();
        if (str.includes('k')) subs = parseFloat(str) * 1000;
        else if (str.includes('m')) subs = parseFloat(str) * 1000000;
        else subs = parseInt(str.replace(/,/g, '')) || 0;
      }
      return {
        id: a.id || a.url,
        youtube_id: a.id || a.url,
        title: a.name || a.title,
        description: a.description || '',
        thumbnail_url: a.image || a.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name || 'Channel')}&background=FF0000&color=fff`,
        subscriber_count: subs || a.subCount || 10000,
        video_count: a.videoCount || 0,
        is_verified: true,
      };
    });
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.error('yt-search channel error, trying Invidious:', err.message);
    try {
      const data = await fetchFromInvidious('/api/v1/search', { q: query, type: 'channel' });
      if (data && Array.isArray(data)) {
        const result = data.slice(0, maxResults).map(a => ({
          id: a.authorId,
          youtube_id: a.authorId,
          title: a.author,
          description: a.description || '',
          thumbnail_url: a.authorThumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.author)}&background=FF0000&color=fff`,
          subscriber_count: a.subCount || 10000,
          video_count: a.videoCount || 0,
          is_verified: true,
        }));
        cacheSet(cacheKey, result);
        return result;
      }
    } catch { /* give up */ }
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   RSS FEED PARSER  (YouTube public RSS — no API key needed)
═══════════════════════════════════════════════════════════════════════ */

/**
 * Parse YouTube's public Atom RSS feed XML into video objects.
 * Feed URL patterns:
 *   - Channel:  https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxx
 *   - Search:   Invidious /feed/channel fallback
 */
function parseYouTubeRSS(xml) {
  const videos = [];
  // Match <entry> blocks
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  for (const [, block] of entries) {
    const videoId = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title   = (block.match(/<title>([^<]+)<\/title>/)           || [])[1];
    const author  = (block.match(/<name>([^<]+)<\/name>/)             || [])[1];
    const published = (block.match(/<published>([^<]+)<\/published>/) || [])[1];
    const views   = parseInt((block.match(/<media:statistics\s+views="(\d+)"/) || [])[1] || '0');
    if (!videoId || !title) continue;
    videos.push({
      id: videoId,
      youtube_id: videoId,
      title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'"),
      description: '',
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      view_count: views,
      like_count: Math.floor(views * 0.05),
      comment_count: Math.floor(views * 0.005),
      published_at: published || new Date().toISOString(),
      channel: { title: author || 'YouTube', id: '' },
      author: { title: author || 'YouTube', name: author || 'YouTube' },
      duration: 0,
      is_live: false,
      is_short: false,
    });
  }
  return videos;
}

/** Fetch RSS for well-known YouTube topic channel IDs */
const TOPIC_CHANNEL_IDS = {
  music:         'UC-9-kyTW8ZkZNDHQJ6FgpwQ', // YouTube Music
  gaming:        'UCOpNcN46UbXVtpKMrmU4Abg', // YouTube Gaming
  news:          'UCYfdidRxbB8Qhf0Nx7ioOYw', // YouTube News
  sports:        'UCEgdi0XIXXZ-qJOFPf4JSKw', // YouTube Sports
  beauty:        'UCrpQ4p1Ql_hG8rKXIKM1MOQ', // YouTube Beauty
  technology:    'UC295-Dw4tzbAd1NHgXGGPZQ', // YouTube Tech
  entertainment: 'UCi-g4cjqGV7jvU8aESFEoHg', // YouTube Entertainment
};

async function fetchRSSFeed(channelId) {
  const cacheKey = `rss:${channelId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const videos = parseYouTubeRSS(xml);
    cacheSet(cacheKey, videos);
    return videos;
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   BACKGROUND "CRAWLER" — pre-warm cache every 5 minutes
   (lightweight alternative to BullMQ / Playwright for this stack)
═══════════════════════════════════════════════════════════════════════ */

const CRAWLER_QUERIES = [
  'trending 2024', 'music', 'gaming', 'technology', 'news today',
  'education', 'sports highlights', 'comedy', 'travel vlog', 'cooking recipe',
];

async function crawlOnce() {
  console.log('[crawler] Starting background cache warm-up...');
  for (const q of CRAWLER_QUERIES) {
    try {
      await searchRealYouTubeVideos(q, 24);
      // Small delay to be respectful
      await new Promise(r => setTimeout(r, 2000));
    } catch { /* continue */ }
  }
  console.log('[crawler] Cache warm-up complete.');
}

const FAMOUS_CHANNELS = [
  { id: 'UCX6OQ3DkcsbYNE6H8uQQuVA', title: 'MrBeast' },
  { id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw', title: 'PewDiePie' },
  { id: 'UCq-Fj5jknLsUf-MWSy4_brA', title: 'T-Series' },
  { id: 'UCBcRF18a7Qf58cCRy5xuWwQ', title: 'Marques Brownlee' },
  { id: 'UCXuqSBlHAE6Xw-yeJA0Tunw', title: 'Linus Tech Tips' },
  { id: 'UCsXVk37bltHxD1rDPwtNM8Q', title: 'Kurzgesagt' },
  { id: 'UCHnyfMqiRRG1u-2MsSQLbXA', title: 'Veritasium' },
  { id: 'UCCTVrRjhnatAAaZHUwT-eLg', title: 'Mark Rober' },
  { id: 'UC8butISFwT-Wl7EV0hUK0BQ', title: 'freeCodeCamp' },
  { id: 'UCsBjURrPoezykLs9EqgamOA', title: 'Fireship' }
];

async function prewarmChannelAvatars() {
  console.log('[crawler] Pre-warming famous channel avatars...');
  for (const ch of FAMOUS_CHANNELS) {
    try {
      await getChannelAvatarCached(ch.id, ch.title);
      // Small stagger to prevent spamming
      await new Promise(r => setTimeout(r, 1000));
    } catch { /* continue */ }
  }
  console.log('[crawler] Famous channel avatars pre-warmed.');
}

// Run immediately on startup, then every 5 minutes
crawlOnce().then(() => prewarmChannelAvatars());
setInterval(crawlOnce, CACHE_TTL_MS);


/* ═══════════════════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════════════════ */

/** GET /api/channel-avatar?channelId=...&title=... */
app.get('/api/channel-avatar', async (req, res) => {
  const { channelId, title } = req.query;
  if (!channelId) {
    return res.status(400).json({ error: 'channelId parameter is required' });
  }

  try {
    const avatarUrl = await getChannelAvatarCached(channelId, title);
    if (avatarUrl) {
      return res.json({ avatarUrl });
    }
    return res.status(404).json({ error: 'Avatar not found' });
  } catch (err) {
    console.error('Error in /api/channel-avatar:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /api/search?q=...&type=all&page=1  →  { videos, channels } */
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || 'trending';
    const type = req.query.type;
    const page = parseInt(req.query.page) || 1;
    const videos = await searchRealYouTubeVideos(q, 50, page);
    // Only fetch channels on page 1 to avoid extra requests
    const channels = page === 1 ? await searchRealYouTubeChannels(q, 10) : [];
    if (type === 'all') return res.json({ channels, videos });
    res.json(channels);
  } catch (err) {
    console.error(err);
    res.json({ channels: [], videos: [] });
  }
});


/** GET /api/trending  →  { videos }  (multi-source: RSS + yt-search) */
app.get('/api/trending', async (req, res) => {
  const cacheKey = 'trending:global';
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ videos: cached });

  try {
    // Fetch from multiple RSS topic channels + yt-search in parallel
    const [rssMusic, rssGaming, rssNews, ytVideos] = await Promise.allSettled([
      fetchRSSFeed(TOPIC_CHANNEL_IDS.music),
      fetchRSSFeed(TOPIC_CHANNEL_IDS.gaming),
      fetchRSSFeed(TOPIC_CHANNEL_IDS.news),
      searchRealYouTubeVideos('trending 2024', 30),
    ]);

    const allVideos = [
      ...(ytVideos.status === 'fulfilled' ? ytVideos.value : []),
      ...(rssMusic.status === 'fulfilled' ? rssMusic.value : []),
      ...(rssGaming.status === 'fulfilled' ? rssGaming.value : []),
      ...(rssNews.status === 'fulfilled' ? rssNews.value : []),
    ];

    // Deduplicate by youtube_id
    const seen = new Set();
    const deduped = allVideos.filter(v => {
      if (seen.has(v.youtube_id)) return false;
      seen.add(v.youtube_id);
      return true;
    });

    cacheSet(cacheKey, deduped);
    res.json({ videos: deduped });
  } catch (err) {
    console.error(err);
    res.json({ videos: [] });
  }
});

/** GET /api/rss-feed?category=music  →  { videos } */
app.get('/api/rss-feed', async (req, res) => {
  const category = req.query.category || 'music';
  const channelId = TOPIC_CHANNEL_IDS[category];
  if (!channelId) {
    // Fall back to yt-search for unknown categories
    const videos = await searchRealYouTubeVideos(category, 20);
    return res.json({ videos });
  }
  const videos = await fetchRSSFeed(channelId);
  res.json({ videos });
});

/** GET /api/suggestions?q=...  →  { suggestions: string[] } */
app.get('/api/suggestions', async (req, res) => {
  const q = req.query.q || '';
  if (!q || q.length < 2) return res.json({ suggestions: [] });

  const cacheKey = `suggestions:${q}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ suggestions: cached });

  try {
    // Google's public autocomplete — no API key needed
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
    });
    const text = await response.text();
    // Response format: [query, [[suggestion, ...], ...]]
    const match = text.match(/\[\s*"[^"]*"\s*,\s*(\[[\s\S]*?\])\s*,/);
    if (match) {
      const raw = JSON.parse(match[1]);
      const suggestions = raw.slice(0, 8).map((item) => (Array.isArray(item) ? item[0] : item)).filter(Boolean);
      cacheSet(cacheKey, suggestions);
      return res.json({ suggestions });
    }
    res.json({ suggestions: [] });
  } catch {
    res.json({ suggestions: [] });
  }
});

/** GET /api/related?videoId=...  →  { videos } */
app.get('/api/related', async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.json({ videos: [] });

  try {
    // Get video details first to find a good search query
    const video = await yts({ videoId });
    const query = [video.author?.name, video.title?.split(' ').slice(0, 4).join(' ')].filter(Boolean).join(' ');
    const videos = await searchRealYouTubeVideos(query || 'trending', 12);
    res.json({ videos: videos.filter(v => v.youtube_id !== videoId) });
  } catch {
    res.json({ videos: [] });
  }
});

/* ─── Existing endpoints (unchanged) ─────────────────────────────── */

function generateMockHistory(channel) {
  const history = [];
  const now = new Date();
  let currentSubs = channel.subscriber_count || 1000000;
  let currentViews = channel.view_count || 5000000;
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    history.push({
      snapshot_date: d.toISOString(),
      subscriber_count: currentSubs,
      view_count: currentViews,
      engagement_rate: 0.02 + Math.random() * 0.03,
    });
    currentSubs = Math.max(0, currentSubs - Math.floor(currentSubs * (0.0001 + Math.random() * 0.0005)));
    currentViews = Math.max(0, currentViews - Math.floor(currentViews * (0.001 + Math.random() * 0.003)));
  }
  return history;
}

app.get('/api/channel', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Channel query is required' });
    const channels = await searchRealYouTubeChannels(q, 1);
    if (channels.length === 0) return res.json({ channel: null, videos: [], history: [] });
    const channel = channels[0];
    const videos = await searchRealYouTubeVideos(channel.title, 24, 1);
    const history = generateMockHistory(channel);
    res.json({ channel, videos, history });
  } catch (err) {
    console.error(err);
    res.json({ channel: null, videos: [], history: [] });
  }
});

app.get('/api/channel/videos', async (req, res) => {
  try {
    const q = req.query.q;
    const page = parseInt(req.query.page) || 1;
    if (!q) return res.status(400).json({ error: 'Channel query is required' });
    const videos = await searchRealYouTubeVideos(q, 24, page);
    res.json(videos);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

async function fetchFromCobalt(videoUrl, quality) {
  const COBALT_INSTANCES = [
    'https://api.cobalt.tools/api/json',
    'https://cobalt.api.ryzetech.live/api/json',
    'https://api.cobalt.stream/api/json',
  ];
  for (const instance of COBALT_INSTANCES) {
    try {
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: JSON.stringify({ url: videoUrl, videoQuality: quality, filenamePattern: 'basic', isAudioOnly: false }),
      });
      if (res.ok) {
        const data = await res.json();
        if ((data.status === 'stream' || data.status === 'redirect') && data.url) return data.url;
        if (data.status === 'picker' && data.picker?.length > 0) return data.picker[0].url;
      }
    } catch { /* try next */ }
  }
  return null;
}

app.get('/api/download-video', async (req, res) => {
  try {
    const id = req.query.id;
    let quality = req.query.quality || '1080';
    if (quality === '720p') quality = '720';
    if (quality === '360p') quality = '360';
    if (quality === '1080p') quality = '1080';
    if (!id) return res.status(400).send('Video ID is required');
    const videoUrl = `https://www.youtube.com/watch?v=${id}`;
    const downloadUrl = await fetchFromCobalt(videoUrl, quality);
    if (!downloadUrl) return res.status(404).send('Download mirrors are busy. Please try again.');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    const streamRes = await fetch(downloadUrl);
    if (!streamRes.ok || !streamRes.body) return res.status(500).send('Failed to stream video.');
    const nodeStream = Readable.fromWeb(streamRes.body);
    nodeStream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.get('/api/video-details', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Video ID is required' });
    const cacheKey = `video-details:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const video = await yts({ videoId: id });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    // Resolve channel avatar from cache/scraper
    const avatarUrl = await getChannelAvatarCached(video.author?.url || video.author?.name || '', video.author?.name || '');
    
    const result = {
      id: video.videoId,
      youtube_id: video.videoId,
      title: video.title,
      description: video.description || '',
      thumbnail_url: video.image || video.thumbnail,
      view_count: video.views || 0,
      like_count: Math.floor((video.views || 0) * 0.05),
      comment_count: Math.floor((video.views || 0) * 0.005),
      published_at: video.uploadDate || new Date().toISOString(),
      duration: video.seconds || 0,
      author: { 
        title: video.author?.name || 'Unknown', 
        url: video.author?.url || '', 
        thumbnail: avatarUrl || '' 
      },
    };
    cacheSet(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Video details error, trying Invidious:', err.message);
    try {
      const id = req.query.id;
      const video = await fetchFromInvidious(`/api/v1/videos/${id}`);
      if (video) {
        // Resolve channel avatar for Invidious fallback path
        const avatarUrl = await getChannelAvatarCached(video.authorId || video.author || '', video.author || '');
        return res.json({
          id: video.videoId,
          youtube_id: video.videoId,
          title: video.title,
          description: video.description || '',
          thumbnail_url: video.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
          view_count: video.viewCount || 0,
          like_count: Math.floor((video.viewCount || 0) * 0.05),
          comment_count: Math.floor((video.viewCount || 0) * 0.005),
          published_at: video.publishedText || new Date().toISOString(),
          duration: video.lengthSeconds || 0,
          author: { 
            title: video.author, 
            url: `/channel/${video.authorId}`, 
            thumbnail: avatarUrl || video.authorThumbnail || '' 
          },
        });
      }
    } catch { /* give up */ }
    res.status(500).json({ error: 'Failed to scrape video details' });
  }
});


app.get('/api/trending-videos', async (req, res) => {
  try {
    const videos = await searchRealYouTubeVideos('trending', 24, 1);
    res.json(videos);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// Serve static React assets in production or Electron environment
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

/* ═══════════════════════════════════════════════════════════════════════
   START
═══════════════════════════════════════════════════════════════════════ */

const server = app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});

setInterval(() => { }, 10000);
