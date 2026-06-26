import { useState } from 'react'
import './Skills.css'

export interface Skill {
  id: string
  icon: string
  label: string
  category: string
  systemPrompt: string
  placeholder: string
  inputTemplate?: string
}

export const SKILLS: Skill[] = [
  // Code
  { id: 'code-write', icon: '💻', label: 'Write Code', category: 'Code', systemPrompt: 'You are an expert programmer. Write clean, well-commented code. Always specify the language and explain what it does.', placeholder: 'Describe what you want to build...', inputTemplate: '' },
  { id: 'code-debug', icon: '🐛', label: 'Debug', category: 'Code', systemPrompt: 'You are a debugging expert. Analyze code for bugs, explain what went wrong, and provide a fixed version with explanation.', placeholder: 'Paste your code here...', inputTemplate: 'Debug this code:\n\n' },
  { id: 'code-explain', icon: '🔍', label: 'Explain Code', category: 'Code', systemPrompt: 'You are a coding teacher. Explain code clearly step-by-step as if teaching a beginner. Use analogies where helpful.', placeholder: 'Paste code to explain...', inputTemplate: 'Explain this code:\n\n' },
  { id: 'code-convert', icon: '🔄', label: 'Convert Code', category: 'Code', systemPrompt: 'You are a language conversion expert. Convert code between programming languages while maintaining logic and adding any necessary adjustments.', placeholder: 'Paste code and specify target language...', inputTemplate: 'Convert this to [language]:\n\n' },
  { id: 'code-review', icon: '✅', label: 'Code Review', category: 'Code', systemPrompt: 'You are a senior software engineer doing a thorough code review. Check for bugs, security issues, performance problems, and style issues. Be specific and constructive.', placeholder: 'Paste code to review...', inputTemplate: 'Review this code:\n\n' },
  { id: 'code-regex', icon: '🎯', label: 'Generate Regex', category: 'Code', systemPrompt: 'You are a regex expert. Generate regex patterns with clear explanation of each part. Always test with examples.', placeholder: 'Describe what pattern you need...', inputTemplate: '' },

  // Writing
  { id: 'write-summarize', icon: '📝', label: 'Summarize', category: 'Writing', systemPrompt: 'You are a summarization expert. Create concise, accurate summaries that capture all key points. Use bullet points for clarity.', placeholder: 'Paste text to summarize...', inputTemplate: 'Summarize this:\n\n' },
  { id: 'write-translate', icon: '🌍', label: 'Translate', category: 'Writing', systemPrompt: 'You are a professional translator. Translate accurately while preserving tone, nuance, and cultural context. Note any idioms that need explanation.', placeholder: 'Paste text and specify target language...', inputTemplate: 'Translate to [language]:\n\n' },
  { id: 'write-improve', icon: '✨', label: 'Improve Writing', category: 'Writing', systemPrompt: 'You are a professional editor. Improve clarity, flow, grammar, and style. Show the improved version and briefly explain key changes.', placeholder: 'Paste text to improve...', inputTemplate: 'Improve this text:\n\n' },
  { id: 'write-email', icon: '📧', label: 'Write Email', category: 'Writing', systemPrompt: 'You are a professional communication expert. Write clear, professional emails with appropriate tone, subject line, and structure.', placeholder: 'Describe the email purpose and context...', inputTemplate: '' },
  { id: 'write-story', icon: '📖', label: 'Write Story', category: 'Writing', systemPrompt: 'You are a creative fiction writer. Write engaging stories with vivid descriptions, compelling characters, and interesting plot. Match the requested genre and tone.', placeholder: 'Describe your story idea...', inputTemplate: '' },
  { id: 'write-poem', icon: '🎭', label: 'Write Poem', category: 'Writing', systemPrompt: 'You are a poet. Write expressive, creative poems. Match the requested style (rhyming, free verse, haiku, etc.) and theme.', placeholder: 'Describe the poem theme or style...', inputTemplate: '' },

  // Analysis
  { id: 'analysis-sentiment', icon: '🎭', label: 'Sentiment Analysis', category: 'Analysis', systemPrompt: 'You are a sentiment analysis expert. Analyze the emotional tone of text. Identify positive, negative, and neutral elements. Rate overall sentiment and explain key phrases driving it.', placeholder: 'Paste text to analyze...', inputTemplate: 'Analyze the sentiment of:\n\n' },
  { id: 'analysis-keypoints', icon: '🔑', label: 'Key Points', category: 'Analysis', systemPrompt: 'You are an information extraction expert. Identify and list the most important points, facts, and insights from any text. Be concise and organized.', placeholder: 'Paste text to extract key points...', inputTemplate: 'Extract key points from:\n\n' },
  { id: 'analysis-compare', icon: '⚖️', label: 'Compare', category: 'Analysis', systemPrompt: 'You are an analytical expert. Compare items systematically using a structured format. Highlight similarities, differences, pros and cons, and give a clear recommendation.', placeholder: 'Describe what to compare...', inputTemplate: 'Compare: ' },
  { id: 'analysis-factcheck', icon: '🔬', label: 'Fact Check', category: 'Analysis', systemPrompt: 'You are a fact-checking assistant. Analyze claims for accuracy based on your training knowledge. Clearly mark what you can and cannot verify, and explain your reasoning.', placeholder: 'Paste claims to fact-check...', inputTemplate: 'Fact-check this:\n\n' },

  // Math
  { id: 'math-solve', icon: '🧮', label: 'Solve Math', category: 'Math', systemPrompt: 'You are a math tutor. Solve problems step-by-step showing all work. Explain each step clearly so the student understands the method, not just the answer.', placeholder: 'Enter your math problem...', inputTemplate: 'Solve step by step:\n' },
  { id: 'math-explain', icon: '📐', label: 'Explain Concept', category: 'Math', systemPrompt: 'You are a math teacher. Explain mathematical concepts clearly with simple examples, analogies, and visual descriptions. Build from basics to advanced.', placeholder: 'What math concept to explain?', inputTemplate: 'Explain the concept of: ' },
  { id: 'math-formula', icon: '📊', label: 'Derive Formula', category: 'Math', systemPrompt: 'You are a mathematician. Derive and explain mathematical formulas from first principles. Show each step of the derivation clearly.', placeholder: 'What formula to derive?', inputTemplate: 'Derive the formula for: ' },

  // Data
  { id: 'data-json', icon: '📦', label: 'Format JSON', category: 'Data', systemPrompt: 'You are a data formatting expert. Format, validate, and explain JSON data. Fix any syntax errors and explain the structure.', placeholder: 'Paste JSON to format...', inputTemplate: 'Format and validate this JSON:\n\n' },
  { id: 'data-extract', icon: '🗂️', label: 'Extract Data', category: 'Data', systemPrompt: 'You are a data extraction expert. Extract structured data from unstructured text. Present results in a clear table or JSON format.', placeholder: 'Paste text to extract data from...', inputTemplate: 'Extract structured data from:\n\n' },
  { id: 'data-sql', icon: '🗄️', label: 'Write SQL', category: 'Data', systemPrompt: 'You are a SQL expert. Write efficient, well-commented SQL queries. Explain what each part does and mention any indexes or optimizations.', placeholder: 'Describe the query you need...', inputTemplate: '' },

  // Brainstorm
  { id: 'brain-ideas', icon: '💡', label: 'Brainstorm', category: 'Brainstorm', systemPrompt: 'You are a creative brainstorming partner. Generate diverse, creative, and practical ideas. Think outside the box and provide a range from conventional to unconventional.', placeholder: 'What do you want ideas for?', inputTemplate: 'Brainstorm ideas for: ' },
  { id: 'brain-plan', icon: '🗓️', label: 'Make a Plan', category: 'Brainstorm', systemPrompt: 'You are a strategic planning expert. Create detailed, actionable plans with clear steps, timelines, and success metrics. Consider potential obstacles and solutions.', placeholder: 'What do you want to plan?', inputTemplate: 'Create a plan for: ' },
  { id: 'brain-pros-cons', icon: '🔀', label: 'Pros & Cons', category: 'Brainstorm', systemPrompt: 'You are a decision analysis expert. Present balanced pros and cons for any topic or decision. Be thorough, consider different perspectives, and give a weighted recommendation.', placeholder: 'What decision to analyze?', inputTemplate: 'Pros and cons of: ' },
]

interface SkillsProps {
  onSelect: (skill: Skill) => void
  onClose: () => void
}

const CATEGORIES = ['Code', 'Writing', 'Analysis', 'Math', 'Data', 'Brainstorm']

export default function SkillsPanel({ onSelect, onClose }: SkillsProps) {
  const [activeCategory, setActiveCategory] = useState('Code')

  const filtered = SKILLS.filter(s => s.category === activeCategory)

  return (
    <div className="skills-overlay" onClick={onClose}>
      <div className="skills-panel" onClick={e => e.stopPropagation()}>
        <div className="skills-header">
          <span>⚡ Skills</span>
          <button className="skills-close" onClick={onClose} aria-label="Close skills panel">✕</button>
        </div>

        {/* Category tabs */}
        <div className="cat-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Skills grid */}
        <div className="skills-grid">
          {filtered.map(skill => (
            <button key={skill.id} className="skill-card" onClick={() => { onSelect(skill); onClose() }}>
              <span className="skill-icon">{skill.icon}</span>
              <span className="skill-label">{skill.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
