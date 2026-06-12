import { describe, it, expect } from 'vitest'
import { parseAgentResponse } from './agent'

describe('parseAgentResponse', () => {
  it('parses all tags correctly in the happy path', () => {
    const response = `
      <thought>First, I will do this.</thought>
      <plan>1. Step 1\n2. Step 2</plan>
      <command>echo "Hello World"</command>
      <write_file path="/test/file.txt">
        File content here
      </write_file>
      <result>Success</result>
    `
    const parsed = parseAgentResponse(response)
    expect(parsed).toEqual({
      thoughts: ['First, I will do this.'],
      plan: '1. Step 1\n2. Step 2',
      command: 'echo "Hello World"',
      writeFile: {
        path: '/test/file.txt',
        content: 'File content here'
      },
      result: 'Success',
    })
  })

  it('handles missing tags gracefully', () => {
    const parsed = parseAgentResponse('Just some random text without any XML tags.')
    expect(parsed).toEqual({
      thoughts: [],
      plan: null,
      command: null,
      writeFile: null,
      result: null,
    })
  })

  it('parses multiple <thought> blocks', () => {
    const response = `
      <thought>First thought</thought>
      Some ignored text.
      <thought>
        Second thought with newlines
      </thought>
      <plan>Plan here</plan>
    `
    const parsed = parseAgentResponse(response)
    expect(parsed.thoughts).toEqual(['First thought', 'Second thought with newlines'])
    expect(parsed.plan).toBe('Plan here')
  })

  it('ignores extraneous text outside tags', () => {
    const response = `
      This text should be ignored.
      <command>ls -la</command>
      This text too.
      <result>Done</result>
      And this.
    `
    const parsed = parseAgentResponse(response)
    expect(parsed.command).toBe('ls -la')
    expect(parsed.result).toBe('Done')
  })

  it('handles line breaks and trims content', () => {
    const response = `
      <plan>
        Line 1
        Line 2
      </plan>
      <command>
        npm run test
      </command>
    `
    const parsed = parseAgentResponse(response)
    expect(parsed.plan).toBe('Line 1\n        Line 2')
    expect(parsed.command).toBe('npm run test')
  })

  it('is case-insensitive for tags', () => {
    const response = `
      <THOUGHT>Upper thought</THOUGHT>
      <Plan>Mixed plan</Plan>
      <COMMAND>make</COMMAND>
      <WRITE_FILE path="A.txt">content</WRITE_FILE>
      <ReSuLt>mixed result</ReSuLt>
    `
    const parsed = parseAgentResponse(response)
    expect(parsed.thoughts).toEqual(['Upper thought'])
    expect(parsed.plan).toBe('Mixed plan')
    expect(parsed.command).toBe('make')
    expect(parsed.writeFile).toEqual({ path: 'A.txt', content: 'content' })
    expect(parsed.result).toBe('mixed result')
  })

  it('parses write_file paths with spaces and special characters', () => {
    const response = `
      <write_file path="/home/user/My Documents/test-file_name.123.txt">
        Some content
      </write_file>
    `
    const parsed = parseAgentResponse(response)
    expect(parsed.writeFile).toEqual({
      path: '/home/user/My Documents/test-file_name.123.txt',
      content: 'Some content'
    })
  })
})
