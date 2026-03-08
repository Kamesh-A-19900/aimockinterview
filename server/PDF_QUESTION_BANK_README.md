# PDF Question Bank System

## Overview

The PDF Question Bank System processes interview question PDFs and creates a persistent vector database for intelligent, context-aware question generation. This system ensures that interview questions are based on real interview scenarios and stay within proven patterns.

## Features

✅ **One-time PDF Processing**: Process PDF once, use forever  
✅ **Persistent Storage**: Embeddings stored safely, no reprocessing needed  
✅ **Context-Aware Questions**: Questions adapt to candidate responses  
✅ **Scenario-Based Flow**: Stay within real interview scenarios  
✅ **Automatic Integration**: Works seamlessly with existing interview agents  
✅ **Smart Fallbacks**: Graceful degradation if question bank unavailable  

## How It Works

### 1. PDF Processing
- Extracts text content from interview PDF
- Parses interview scenarios and Q&A pairs
- Identifies topics, difficulty levels, and question types
- Creates semantic embeddings for similarity search

### 2. Vector Database Storage
- Stores scenarios and Q&A pairs in ChromaDB
- Maintains persistent embeddings (survives server restarts)
- Enables fast semantic similarity search
- Isolates data by user for privacy

### 3. Intelligent Question Generation
- Analyzes candidate's last answer
- Finds most relevant scenarios from question bank
- Provides context to interviewer agent
- Generates questions inspired by real interview patterns

## Setup Instructions

### Automatic Setup (Recommended)
1. Place your `interview_question.pdf` in the root directory
2. Start the server: `npm start` or `npm run dev`
3. The system will automatically detect and process the PDF
4. PDF will be deleted after processing (as requested)

### Manual Setup
1. Place your `interview_question.pdf` in the root directory
2. Run: `npm run init-questions`
3. Start the server normally

### Verification
Check if the question bank is working:
```bash
curl http://localhost:5000/api/interview/question-bank-status
```

Expected response:
```json
{
  "success": true,
  "questionBank": {
    "initialized": true,
    "totalScenarios": 25,
    "totalQAPairs": 150,
    "difficultyLevels": {
      "beginner": 8,
      "intermediate": 12,
      "advanced": 5
    },
    "scenarioTypes": {
      "technical": 15,
      "behavioral": 8,
      "general": 2
    }
  }
}
```

## File Structure

```
server/
├── services/
│   ├── pdfQuestionBankService.js    # Main PDF processing service
│   └── chromaService.js             # Enhanced with question bank support
├── scripts/
│   └── initializeQuestionBank.js    # Manual initialization script
├── data/                            # Created automatically
│   ├── processed_questions.json     # Processed scenarios (backup)
│   └── question_embeddings.json     # Embedding metadata
└── agents/
    └── interviewerAgent.js          # Enhanced with question bank integration
```

## How Questions Are Selected

### 1. Context Analysis
- Analyzes candidate's last answer for technical concepts
- Extracts topics from resume (skills, experience, projects)
- Tracks previously covered topics to avoid repetition

### 2. Semantic Search
- Searches question bank for most relevant scenarios
- Uses cosine similarity with 70%+ relevance threshold
- Prioritizes scenarios matching candidate's background

### 3. Question Adaptation
- Provides top 3 most relevant scenarios to interviewer agent
- Agent adapts questions to fit conversation flow
- Maintains professional interview standards
- Stays within proven interview patterns

## Question Bank Statistics

The system tracks comprehensive statistics:

- **Total Scenarios**: Number of interview scenarios processed
- **Q&A Pairs**: Individual questions and answers extracted
- **Difficulty Distribution**: Beginner, intermediate, advanced levels
- **Scenario Types**: Technical, behavioral, general categories
- **Topic Coverage**: Most common technical and soft skill topics

## Persistence & Safety

### Data Persistence
- ✅ Embeddings stored in ChromaDB collections
- ✅ Processed data backed up in JSON files
- ✅ Survives server restarts and recompilation
- ✅ No need to reprocess unless adding new content

### Data Safety
- 🔒 User-isolated caching (privacy protected)
- 🔒 Persistent storage in `server/data/` directory
- 🔒 Automatic backup of processed scenarios
- 🔒 Graceful fallback if question bank unavailable

## Integration with Interview Agents

### Interviewer Agent Enhancement
The interviewer agent now:
1. Queries question bank for relevant scenarios
2. Receives top 3 most relevant questions with context
3. Adapts questions to fit conversation flow
4. Maintains professional interview standards
5. Falls back to default behavior if question bank unavailable

### Prompt Enhancement
The agent prompt now includes:
- Relevant scenarios from question bank
- Relevance scores and difficulty levels
- Instructions to stay within proven patterns
- Guidance to adapt rather than copy exactly

## Troubleshooting

### Question Bank Not Initialized
```bash
# Check status
curl http://localhost:5000/api/interview/question-bank-status

# Manual initialization
npm run init-questions
```

### PDF Processing Errors
- Ensure PDF is readable (not password protected)
- Check PDF contains interview content (Q&A patterns)
- Verify sufficient disk space for processing
- Check server logs for detailed error messages

### No Relevant Questions Found
- Normal behavior for very unique candidate responses
- System falls back to default question generation
- Consider adding more diverse scenarios to PDF

### Performance Issues
- Question bank queries are cached for performance
- Initial processing may take 1-2 minutes for large PDFs
- Subsequent queries are very fast (< 100ms)

## API Endpoints

### Question Bank Status
```
GET /api/interview/question-bank-status
Authorization: Bearer <token>
```

Returns question bank statistics and initialization status.

### Rate Limit Status (Enhanced)
```
GET /api/interview/rate-limit-status
Authorization: Bearer <token>
```

Returns rate limiting status (prevents API throttling).

## Best Practices

### PDF Content Format
For best results, your PDF should contain:
- Clear interview scenarios
- Q&A pairs with identifiable patterns
- Variety of technical and behavioral questions
- Different difficulty levels
- Real interview conversations

### Question Quality
The system works best when:
- PDF contains diverse interview scenarios
- Questions cover multiple technical areas
- Behavioral questions use STAR method examples
- Content includes both junior and senior level questions

### Monitoring
- Check question bank status regularly
- Monitor interview agent logs for question bank usage
- Verify questions stay within expected scenarios
- Track candidate engagement with question bank questions

## Future Enhancements

Planned improvements:
- Support for multiple PDF files
- Dynamic difficulty adjustment
- Question effectiveness tracking
- Advanced scenario categorization
- Real-time question bank updates

---

## Summary

The PDF Question Bank System transforms your interview PDFs into an intelligent, context-aware question generation system. It ensures that:

1. ✅ **Questions are based on real interview scenarios**
2. ✅ **Content stays within proven patterns**
3. ✅ **System adapts to candidate responses**
4. ✅ **No reprocessing needed after setup**
5. ✅ **Graceful fallbacks ensure reliability**

The system is now ready to provide intelligent, scenario-based interview questions that adapt to each candidate while staying within the boundaries of your proven interview content.