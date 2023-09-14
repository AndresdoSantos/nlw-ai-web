import { useEffect, useState } from 'react'

import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { api } from '@/lib/axios'

type Prompt = {
  id: string
  title: string
  template: string
}

type Props = {
  onPromptSelected(template: string): void
}

export function PromptSelect({ onPromptSelected }: Props) {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null)

  function handlePromptSelected(promptId: string) {
    const selectedPrompt = prompts?.find((prompt) => prompt.id === promptId)

    if (selectedPrompt) {
      onPromptSelected(selectedPrompt.template)
    }
  }

  useEffect(() => {
    api.get('prompts').then((response) => setPrompts(response.data))
  }, [])

  return (
    <div className="space-y-2">
      <Label>Prompt</Label>

      <Select onValueChange={handlePromptSelected}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um prompt..." />
        </SelectTrigger>

        <SelectContent>
          {prompts?.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
