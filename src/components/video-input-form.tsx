import { FileVideo, Upload } from 'lucide-react'
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react'
import { fetchFile } from '@ffmpeg/util'

import { Label } from './ui/label'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Separator } from './ui/separator'

import { getFFmpeg } from '@/lib/ffmpeg'
import { api } from '@/lib/axios'

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessage = {
  converting: 'Convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!',
}

type Props = {
  onSelectVideoId(videoId: string): void
}

export function VideoInputForm({ onSelectVideoId }: Props) {
  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) {
      return
    }

    const selectedFiles = files[0]

    setVideoFile(selectedFiles)
  }

  async function convertVideoToAudio(video: File) {
    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    ffmpeg.on('progress', (progress) => {
      Math.round(progress.progress * 100)
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3',
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg',
    })

    return audioFile
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = promptInputRef.current?.value

    if (!videoFile) {
      return
    }

    setStatus('converting')

    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append('file', audioFile)

    setStatus('uploading')

    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    onSelectVideoId(videoId)

    setStatus('generating')

    await api.post(`/videos/${videoId}/transcription`, { prompt })

    setStatus('success')
  }

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile)
  }, [videoFile])

  return (
    <form action="" className="space-y-6" onSubmit={handleUploadVideo}>
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {previewURL ? (
          <video
            src={previewURL}
            controls={false}
            className="pointer-events-none absolute inset-0"
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Selecione vídeo
          </>
        )}
      </label>

      <input
        type="file"
        name=""
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>

        <Textarea
          ref={promptInputRef}
          disabled={status !== 'waiting'}
          id="transcription_prompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)"
        />
      </div>

      <Button
        type="submit"
        disabled={status !== 'waiting'}
        className="w-full data-[success=true]:bg-emerald-400"
        data-success={status === 'success'}
      >
        {status === 'waiting' ? 'Carregar vídeo' : statusMessage[status]}
        <Upload className="w-4 h-4 mr-2" />
      </Button>
    </form>
  )
}
