import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { YouTubeBrowser } from './pages/YouTubeBrowser'
import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getChannelDetails } from './lib/youtube-api'

function App() {
  useEffect(() => {
    async function syncChannels() {
      try {
        const { data: dbChannels } = await supabase.from('channels').select('id, title, thumbnail_url')
        if (!dbChannels) return
        
        for (const ch of dbChannels) {
          // If it uses unavatar or has a placeholder, sync it with live YouTube data
          if (!ch.thumbnail_url || ch.thumbnail_url.includes('unavatar.io')) {
            getChannelDetails(ch.title)
              .then(async (liveData) => {
                if (liveData && liveData.channel) {
                  const { error } = await supabase
                    .from('channels')
                    .update({
                      thumbnail_url: liveData.channel.thumbnail_url,
                      subscriber_count: liveData.channel.subscriber_count,
                      view_count: liveData.channel.view_count,
                      video_count: liveData.channel.video_count,
                      description: liveData.channel.description
                    })
                    .eq('id', ch.id)
                  
                  if (!error && liveData.videos && liveData.videos.length > 0) {
                    // Sync videos
                    for (const v of liveData.videos) {
                      await supabase.from('videos').upsert({
                        channel_id: ch.id,
                        youtube_id: v.youtube_id,
                        title: v.title,
                        thumbnail_url: v.thumbnail_url,
                        view_count: v.view_count,
                        like_count: v.like_count,
                        comment_count: v.comment_count,
                        duration: v.duration,
                        is_short: false
                      }, { onConflict: 'youtube_id' })
                    }
                  }
                }
              })
              .catch(err => console.error('Sync error for', ch.title, err))
          }
        }
      } catch (err) {
        console.error('Error syncing channels:', err)
      }
    }
    
    const timer = setTimeout(syncChannels, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/youtube-browser" element={<YouTubeBrowser />} />
          </Routes>


        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
