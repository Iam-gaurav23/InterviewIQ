import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi } from "../services/openRouter.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";


// =========================================================
// ANALYZE RESUME
// =========================================================

export const analyzeResume = async (req, res) => {
  let filepath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Resume required"
      });
    }

    filepath = req.file.path;

    // =====================================================
    // READ PDF
    // =====================================================

    const fileBuffer = await fs.promises.readFile(filepath);
    const uint8Array = new Uint8Array(fileBuffer);

    const pdf = await pdfjsLib.getDocument({
      data: uint8Array
    }).promise;

    let resumeText = "";

    // =====================================================
    // EXTRACT TEXT FROM ALL PAGES
    // =====================================================

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const pageText = content.items
        .map(item => item.str)
        .join(" ");

      resumeText += pageText + "\n";
    }

    resumeText = resumeText
      .replace(/\s+/g, " ")
      .trim();
      console.log("\n========== EXTRACTED RESUME ==========");
console.log(resumeText);
console.log("=======================================\n");

    console.log("\n====================================");
    console.log("RESUME TEXT EXTRACTED");
    console.log("Length:", resumeText.length);
    console.log("====================================\n");


    // =====================================================
    // AI RESUME EXTRACTION
    // =====================================================

    const messages = [
      {
        role: "system",

        content: `
You are a resume parser.

Your ONLY task is to extract information from the resume text.

Do NOT perform safety classification.
Do NOT classify the user.
Do NOT write "User Safety".
Do NOT write "safe" or "unsafe".
Do NOT provide explanations.
Do NOT provide markdown.
Do NOT provide code fences.
Do NOT provide any text outside the JSON.
Do NOT invent information.

Extract ONLY these four fields:

1. role
2. experience
3. projects
4. skills

Use ONLY information that actually appears in the resume.

If something is not found:
- use an empty string for role or experience
- use an empty array for projects or skills

Return ONLY valid JSON.

The response MUST follow exactly this structure:

{
  "role": "string",
  "experience": "string",
  "projects": ["project1", "project2"],
  "skills": ["skill1", "skill2"]
}
`
      },

      {
        role: "user",
        content: resumeText
      }
    ];


    // =====================================================
    // CALL AI
    // =====================================================

    const aiResponse = await askAi(messages);

    console.log("\n====================================");
    console.log("RAW RESUME AI RESPONSE:");
    console.log(aiResponse);
    console.log("====================================\n");


    if (!aiResponse || !aiResponse.trim()) {
      return res.status(500).json({
        message: "AI returned an empty resume analysis."
      });
    }


    // =====================================================
    // CLEAN AI RESPONSE
    // =====================================================

    let cleanedResponse = aiResponse.trim();

    cleanedResponse = cleanedResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();


    // =====================================================
    // PARSE JSON SAFELY
    // =====================================================

    let parsed;

    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (error) {

      console.log("\n====================================");
      console.log("RESUME JSON PARSE ERROR:");
      console.log(error.message);
      console.log("AI RESPONSE:");
      console.log(aiResponse);
      console.log("====================================\n");

      return res.status(500).json({
        message: "AI failed to extract resume information."
      });
    }


    // =====================================================
    // VALIDATE AI RESPONSE
    // =====================================================

    const role =
      typeof parsed.role === "string"
        ? parsed.role.trim()
        : "";

    const experience =
      typeof parsed.experience === "string"
        ? parsed.experience.trim()
        : "";

    const projects =
      Array.isArray(parsed.projects)
        ? parsed.projects.filter(
            project =>
              typeof project === "string" &&
              project.trim().length > 0
          )
        : [];

    const skills =
      Array.isArray(parsed.skills)
        ? parsed.skills.filter(
            skill =>
              typeof skill === "string" &&
              skill.trim().length > 0
          )
        : [];


    // =====================================================
    // DEBUG
    // =====================================================

    console.log("\n========== RESUME ANALYSIS ==========");
    console.log("ROLE:", role);
    console.log("EXPERIENCE:", experience);
    console.log("PROJECTS:", projects);
    console.log("SKILLS:", skills);
    console.log("=====================================\n");


    // =====================================================
    // DELETE TEMPORARY PDF
    // =====================================================

    if (filepath && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }


    // =====================================================
    // SEND RESULT TO FRONTEND
    // =====================================================

    return res.json({
      role,
      experience,
      projects,
      skills,
      resumeText
    });

  } catch (error) {

    console.error("\nRESUME ANALYSIS ERROR:");
    console.error(error);


    // =====================================================
    // DELETE FILE IF ERROR OCCURS
    // =====================================================

    if (filepath && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }


    return res.status(500).json({
      message: error.message || "Failed to analyze resume."
    });
  }
};



// =========================================================
// GENERATE INTERVIEW QUESTIONS
// =========================================================

export const generateQuestion = async (req, res) => {

  try {

    let {
      role,
      experience,
      mode,
      resumeText,
      projects,
      skills
    } = req.body;


    // =====================================================
    // CLEAN INPUT
    // =====================================================

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();


    if (!role || !experience || !mode) {
      return res.status(400).json({
        message: "Role, Experience and Mode are required."
      });
    }


    // =====================================================
    // FIND USER
    // =====================================================

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }


    // =====================================================
    // CHECK CREDITS
    // =====================================================

    if (user.credits < 50) {
      return res.status(400).json({
        message: "Not enough credits. Minimum 50 required."
      });
    }


    // =====================================================
    // PREPARE RESUME DATA
    // =====================================================

    const projectText =
      Array.isArray(projects) && projects.length
        ? projects.join(", ")
        : "None";

    const skillsText =
      Array.isArray(skills) && skills.length
        ? skills.join(", ")
        : "None";

    const safeResume =
      typeof resumeText === "string" && resumeText.trim()
        ? resumeText.trim()
        : "None";


    // =====================================================
    // DEBUG INPUT
    // =====================================================

    console.log("\n========== GENERATE QUESTION INPUT ==========");
    console.log("ROLE:", role);
    console.log("EXPERIENCE:", experience);
    console.log("MODE:", mode);
    console.log("PROJECTS:", projects);
    console.log("SKILLS:", skills);
    console.log("RESUME LENGTH:", safeResume.length);
    console.log("=============================================\n");


    // =====================================================
    // CANDIDATE INFORMATION
    // =====================================================

    const userPrompt = `
Candidate Information:

Role:
${role}

Experience:
${experience}

Interview Mode:
${mode}

Projects:
${projectText}

Skills:
${skillsText}

Resume:
${safeResume}
`;


    // =====================================================
    // INTERVIEW QUESTION GENERATION
    // =====================================================

    const messages = [

      {
        role: "system",

        content: `
You are a professional technical interviewer.

You are interviewing a real candidate for a ${role} position.

Your questions MUST be based primarily on the candidate's actual resume.

IMPORTANT:

Generate EXACTLY 10 interview questions.

Return ONLY valid JSON.

Do NOT return:
- Markdown
- Code fences
- Explanations
- Answers
- Feedback
- Safety classifications
- Metadata
- Labels
- Extra text

Return exactly:

{
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5",
    "Question 6",
    "Question 7",
    "Question 8",
    "Question 9",
    "Question 10"
  ]
}


=========================================================
RESUME-BASED INTERVIEW
=========================================================

At least 7 of the 10 questions MUST be directly based on
information found in the candidate's resume.

Use actual information from:

- Projects
- Technologies
- Programming languages
- Frameworks
- Databases
- AI/ML technologies
- APIs
- Authentication
- Work experience
- Achievements
- Certifications
- Other technical skills


IMPORTANT:

Do NOT say that the candidate has no projects if projects
are present in the supplied candidate information.

Do NOT invent projects.

Do NOT invent technologies.

Do NOT replace the candidate's actual projects with generic
hypothetical projects.

If the resume contains projects, ask about those projects.

If the resume contains React, ask about React implementation.

If the resume contains Node.js or Express.js, ask about
backend implementation.

If the resume contains MongoDB, ask how MongoDB was used.

If the resume contains JWT, ask about authentication.

If the resume contains AI projects, ask about the actual
AI architecture and implementation.


=========================================================
QUESTION DISTRIBUTION
=========================================================

Question 1:
Candidate background or a real project from the resume.

Question 2:
Specific question about one real project.

Question 3:
Implementation of a technology mentioned in the resume.

Question 4:
Deeper technical question about a real project.

Question 5:
Backend, API or database implementation from the resume.

Question 6:
Frontend implementation or architecture from the resume.

Question 7:
Authentication, security, API, database or deployment
based on something actually mentioned in the resume.

Question 8:
Practical scenario related to a real project or technology.

Question 9:
Deep follow-up testing whether the candidate actually
understands something claimed on the resume.

Question 10:
Most difficult technical question based on the candidate's
actual resume/projects.


=========================================================
INTERVIEW STYLE
=========================================================

Questions should be:

- Natural
- Conversational
- Technical
- Specific
- Relevant
- Resume-based
- Appropriate for the candidate's experience

Avoid repeatedly asking simple definitions.

Prefer questions such as:

"How did you implement JWT authentication in your project?"

"What problem were you solving with this project?"

"Why did you choose MongoDB for this application?"

"How does data flow from your React frontend to your Node.js backend?"

"How did you handle errors in your API?"

"What was the most difficult technical problem you faced?"

"What would you improve in this project?"


=========================================================
DIFFICULTY
=========================================================

Question 1 → Easy
Question 2 → Easy
Question 3 → Easy/Medium
Question 4 → Medium
Question 5 → Medium
Question 6 → Medium
Question 7 → Medium/Hard
Question 8 → Hard
Question 9 → Hard
Question 10 → Hard


=========================================================
STRICT RULES
=========================================================

1. EXACTLY 10 questions.
2. Every item must be a real interview question.
3. Every item must be a string.
4. At least 7 questions must directly reference the resume.
5. Never invent projects.
6. Never invent technologies.
7. Use supplied projects and skills when available.
8. Do not ask generic questions when resume information exists.
9. Do not include answers.
10. Do not include feedback.
11. Do not include safety text.
12. Do not include "User Safety: safe".
13. Do not include question numbers.
14. Do not include extra text outside JSON.
15. Return valid JSON only.
`
      },


      {
        role: "user",
        content: userPrompt
      }

    ];


    // =====================================================
    // CALL AI
    // =====================================================

    const aiResponse = await askAi(messages);


    if (!aiResponse || !aiResponse.trim()) {
      return res.status(500).json({
        message: "AI returned empty response."
      });
    }


    // =====================================================
    // DEBUG AI RESPONSE
    // =====================================================

    console.log("\n====================================");
    console.log("RAW AI QUESTION RESPONSE:");
    console.log(aiResponse);
    console.log("====================================\n");


    // =====================================================
    // CLEAN RESPONSE
    // =====================================================

    let cleanedResponse = aiResponse.trim();

    cleanedResponse = cleanedResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();


    // =====================================================
    // PARSE JSON
    // =====================================================

    let parsedResponse;

    try {

      parsedResponse = JSON.parse(cleanedResponse);

    } catch (error) {

      console.log(
        "JSON PARSE ERROR:",
        error.message
      );

      return res.status(500).json({
        message: "AI returned an invalid question format."
      });
    }


    // =====================================================
    // GET QUESTIONS
    // =====================================================

    const questionsArray =
      parsedResponse.questions;


    // =====================================================
    // VALIDATE ARRAY
    // =====================================================

    if (!Array.isArray(questionsArray)) {

      return res.status(500).json({
        message:
          "AI response does not contain a questions array."
      });

    }


    // =====================================================
    // EXACTLY 10 QUESTIONS
    // =====================================================

    if (questionsArray.length !== 10) {

      console.log(
        `AI generated ${questionsArray.length} questions instead of 10.`
      );

      return res.status(500).json({
        message:
          `AI generated ${questionsArray.length} questions instead of exactly 10.`
      });

    }


    // =====================================================
    // VALIDATE EACH QUESTION
    // =====================================================

    const invalidQuestion =
      questionsArray.some(
        question =>
          typeof question !== "string" ||
          question.trim().length === 0
      );


    if (invalidQuestion) {

      return res.status(500).json({
        message:
          "AI generated an invalid question."
      });

    }


    // =====================================================
    // CLEAN QUESTIONS
    // =====================================================

    const finalQuestions =
      questionsArray.map(question =>
        question.trim()
      );


    // =====================================================
    // DEDUCT CREDITS
    // =====================================================

    user.credits -= 50;

    await user.save();


    // =====================================================
    // CREATE INTERVIEW
    // =====================================================

    const interview =
      await Interview.create({

        userId: user._id,

        role,

        experience,

        mode,

        resumeText: safeResume,

        questions: finalQuestions.map(
          (question, index) => ({

            question,

            difficulty: [
              "easy",
              "easy",
              "easy",
              "medium",
              "medium",
              "medium",
              "medium",
              "hard",
              "hard",
              "hard"
            ][index],

            timeLimit: [
              60,
              60,
              60,
              90,
              90,
              90,
              90,
              120,
              120,
              120
            ][index]

          })
        )

      });


    // =====================================================
    // SEND RESPONSE
    // =====================================================

    return res.json({

      interviewId:
        interview._id,

      creditsLeft:
        user.credits,

      userName:
        user.name,

      questions:
        interview.questions

    });


  } catch (error) {

    console.error(
      "GENERATE QUESTION ERROR:",
      error
    );

    return res.status(500).json({
      message:
        `failed to create interview ${error}`
    });

  }

};



// =========================================================
// SUBMIT ANSWER
// =========================================================

export const submitAnswer = async (req, res) => {

  try {

    const {
      interviewId,
      questionIndex,
      answer,
      timeTaken
    } = req.body;


    const interview =
      await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found."
      });
    }


    const question =
      interview.questions[questionIndex];


    if (!question) {
      return res.status(400).json({
        message: "Invalid question index."
      });
    }


    // =====================================================
    // NO ANSWER
    // =====================================================

    if (!answer) {

      question.score = 0;

      question.feedback =
        "You did not submit an answer.";

      question.answer = "";


      await interview.save();


      return res.json({
        feedback: question.feedback
      });

    }


    // =====================================================
    // TIME EXCEEDED
    // =====================================================

    if (timeTaken > question.timeLimit) {

      question.score = 0;

      question.feedback =
        "Time limit exceeded. Answer not evaluated.";

      question.answer = answer;


      await interview.save();


      return res.json({
        feedback: question.feedback
      });

    }


    // =====================================================
    // AI EVALUATION
    // =====================================================

    const messages = [

      {
        role: "system",

        content: `
You are a professional human interviewer evaluating a candidate's answer.

Evaluate naturally and fairly.

Score the answer in these areas from 0 to 10:

1. Confidence
2. Communication
3. Correctness

Calculate:

finalScore = average of confidence,
communication and correctness.

Round finalScore to the nearest whole number.

Feedback Rules:

- Write natural human feedback.
- 10 to 15 words only.
- Be professional and honest.
- Suggest improvement when necessary.
- Do NOT repeat the question.
- Do NOT explain scoring.

Return ONLY valid JSON:

{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short human feedback"
}

Do NOT return markdown.
Do NOT return code fences.
Do NOT return any extra text.
`
      },


      {
        role: "user",

        content: `
Question:
${question.question}

Answer:
${answer}
`
      }

    ];


    const aiResponse =
      await askAi(messages);


    // =====================================================
    // CLEAN AI RESPONSE
    // =====================================================

    let cleanedResponse =
      aiResponse.trim();

    cleanedResponse =
      cleanedResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();


    // =====================================================
    // PARSE EVALUATION
    // =====================================================

    let parsed;

    try {

      parsed =
        JSON.parse(cleanedResponse);

    } catch (error) {

      console.log(
        "ANSWER EVALUATION JSON ERROR:",
        error.message
      );

      console.log(
        "AI RESPONSE:",
        aiResponse
      );

      return res.status(500).json({
        message:
          "AI returned an invalid evaluation format."
      });

    }


    // =====================================================
    // SAVE ANSWER
    // =====================================================

    question.answer =
      answer;

    question.confidence =
      parsed.confidence;

    question.communication =
      parsed.communication;

    question.correctness =
      parsed.correctness;

    question.score =
      parsed.finalScore;

    question.feedback =
      parsed.feedback;


    await interview.save();


    return res.status(200).json({
      feedback:
        parsed.feedback
    });


  } catch (error) {

    console.error(
      "SUBMIT ANSWER ERROR:",
      error
    );

    return res.status(500).json({
      message:
        `failed to submit answer ${error}`
    });

  }

};



// =========================================================
// FINISH INTERVIEW
// =========================================================

export const finishInterview = async (req, res) => {

  try {

    const {
      interviewId
    } = req.body;


    const interview =
      await Interview.findById(interviewId);


    if (!interview) {

      return res.status(400).json({
        message:
          "failed to find Interview"
      });

    }


    const totalQuestions =
      interview.questions.length;


    let totalScore = 0;

    let totalConfidence = 0;

    let totalCommunication = 0;

    let totalCorrectness = 0;


    interview.questions.forEach((q) => {

      totalScore +=
        q.score || 0;

      totalConfidence +=
        q.confidence || 0;

      totalCommunication +=
        q.communication || 0;

      totalCorrectness +=
        q.correctness || 0;

    });


    const finalScore =
      totalQuestions
        ? totalScore / totalQuestions
        : 0;


    const avgConfidence =
      totalQuestions
        ? totalConfidence / totalQuestions
        : 0;


    const avgCommunication =
      totalQuestions
        ? totalCommunication / totalQuestions
        : 0;


    const avgCorrectness =
      totalQuestions
        ? totalCorrectness / totalQuestions
        : 0;


    interview.finalScore =
      finalScore;

    interview.status =
      "completed";


    await interview.save();


    return res.status(200).json({

      finalScore:
        Number(finalScore.toFixed(1)),

      confidence:
        Number(avgConfidence.toFixed(1)),

      communication:
        Number(avgCommunication.toFixed(1)),

      correctness:
        Number(avgCorrectness.toFixed(1)),

      questionWiseScore:
        interview.questions.map((q) => ({

          question:
            q.question,

          score:
            q.score || 0,

          feedback:
            q.feedback || "",

          confidence:
            q.confidence || 0,

          communication:
            q.communication || 0,

          correctness:
            q.correctness || 0

        }))

    });


  } catch (error) {

    console.error(
      "FINISH INTERVIEW ERROR:",
      error
    );

    return res.status(500).json({
      message:
        `failed to finish Interview ${error}`
    });

  }

};



// =========================================================
// GET MY INTERVIEWS
// =========================================================

export const getMyInterviews = async (req, res) => {

  try {

    const interviews =
      await Interview.find({
        userId: req.userId
      })
      .sort({
        createdAt: -1
      })
      .select(
        "role experience mode finalScore status createdAt"
      );


    return res.status(200).json(
      interviews
    );


  } catch (error) {

    console.error(
      "GET INTERVIEWS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        `failed to find currentUser Interview ${error}`
    });

  }

};



// =========================================================
// GET INTERVIEW REPORT
// =========================================================

export const getInterviewReport = async (req, res) => {

  try {

    const interview =
      await Interview.findById(
        req.params.id
      );


    if (!interview) {

      return res.status(404).json({
        message:
          "Interview not found"
      });

    }


    const totalQuestions =
      interview.questions.length;


    let totalConfidence = 0;

    let totalCommunication = 0;

    let totalCorrectness = 0;


    interview.questions.forEach((q) => {

      totalConfidence +=
        q.confidence || 0;

      totalCommunication +=
        q.communication || 0;

      totalCorrectness +=
        q.correctness || 0;

    });


    const avgConfidence =
      totalQuestions
        ? totalConfidence / totalQuestions
        : 0;


    const avgCommunication =
      totalQuestions
        ? totalCommunication / totalQuestions
        : 0;


    const avgCorrectness =
      totalQuestions
        ? totalCorrectness / totalQuestions
        : 0;


    return res.json({

      finalScore:
        interview.finalScore,

      confidence:
        Number(avgConfidence.toFixed(1)),

      communication:
        Number(avgCommunication.toFixed(1)),

      correctness:
        Number(avgCorrectness.toFixed(1)),

      questionWiseScore:
        interview.questions

    });


  } catch (error) {

    console.error(
      "GET INTERVIEW REPORT ERROR:",
      error
    );

    return res.status(500).json({
      message:
        `failed to find currentUser Interview report ${error}`
    });

  }

};