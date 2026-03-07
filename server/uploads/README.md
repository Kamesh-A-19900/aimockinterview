# Uploads Folder

This folder is used for **temporary storage** of uploaded resume PDF files.

## How it works:

1. User uploads resume PDF
2. File is temporarily saved here
3. Content is extracted using Groq LLM
4. Extracted data is saved to PostgreSQL database
5. **PDF file is automatically deleted** (saves disk space)

## Important:

- PDF files are **NOT stored permanently**
- Only extracted JSON data is kept in database
- This folder should remain mostly empty
- Files here are temporary and will be auto-deleted after processing

## Why auto-delete?

- Saves disk space
- No need to store original PDFs
- All resume data is in database as JSON
- Privacy: No physical files retained
