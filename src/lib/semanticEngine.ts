import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { db } from "./firebase";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface IntelligenceTopology {
  skillScore: number;
  technicalDepth: number;
  activity: number;
  consistency: number;
  network: number;
  diversity: number;
  primarySector: string;
  semanticFeedback: string;
}

export const analyzeProfilePerformance = async (userId: string, profileData: any, force = false) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if analysis is needed (Stale after 24 hours OR force update)
    if (!force && profileData.isAnalyzed && profileData.lastAnalyzedAt) {
      const lastUpdate = profileData.lastAnalyzedAt.toDate();
      const diffHours = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        console.log("Analysis skipped: Data is fresh (under 24h).");
        return profileData as IntelligenceTopology;
      }
    }

    // 1. Fetch recent activity for context
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const postsSnapshot = await getDocs(postsQuery);
    const recentPosts = postsSnapshot.docs.map(doc => doc.data().content).join("\n---\n");

    const prompt = `You are the "Neural Topology Engine" (v4.2). Perform a high-fidelity semantic reconstruction of this user's professional identity.
    
    RESEARCH FRAMEWORK: Cross-domain Expertise Latency & Behavioral Entropy (CELBE Model)
    
    INPUT VECTORS:
    - Identity: ${profileData.firstName} ${profileData.lastName}
    - Verified Endpoints: LinkedIn (${profileData.linkedinUrl || 'Inactive'}), GitHub (${profileData.githubUrl || 'Inactive'})
    - Sector Blueprint: ${profileData.primarySector || 'Generalist'}
    
    FOOTPRINT LOG (Recent Activity):
    ${recentPosts || 'Zero signal detected. Reverting to structural metadata analysis.'}

    ANALYTICAL CONSTRAINTS:
    1. Stability Guard: Previous Skill Score is ${profileData.skillScore || 0}. Ensure smooth gradient transitions.
    2. Weighting: 
       - GitHub Presence => Technical Depth +40%
       - High Quality Content Footprints => Activity Index +25%
       - Sector Alignment => Consistency Vector +20%
    3. Output Format: Strict JSON matching IntelligenceTopology.
    
    GOAL: Generate a stable, authoritative result that reflects high-density professional data. Provide a semantic feedback string that is insightful and technical.`;

    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primarySector: { type: Type.STRING },
            skillScore: { type: Type.NUMBER },
            technicalDepth: { type: Type.NUMBER },
            activity: { type: Type.NUMBER },
            consistency: { type: Type.NUMBER },
            network: { type: Type.NUMBER },
            diversity: { type: Type.NUMBER },
            semanticFeedback: { type: Type.STRING }
          },
          required: ['primarySector', 'skillScore', 'technicalDepth', 'activity', 'consistency', 'network', 'diversity', 'semanticFeedback']
        }
      }
    });

    const resp: any = await model;
    const analysis = JSON.parse(resp.text);

    // Update Firestore with new stable state
    await updateDoc(userRef, {
      ...analysis,
      isAnalyzed: true,
      analysisType: 'DEEP',
      lastAnalyzedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return analysis as IntelligenceTopology;
  } catch (error: any) {
    console.error("Neural Analysis Failed:", error);
    
    // Detect Quota Exceeded (429)
    const errorStr = JSON.stringify(error);
    if (errorStr.includes('429') || errorStr.toLowerCase().includes('quota')) {
      const quotaError = new Error("NEURAL_QUOTA_EXCEEDED");
      throw quotaError;
    }
    
    throw error;
  }
};

/**
 * Meaningful Nudge: Only triggers if the content is technical or professional.
 * Prevents score "oscillation" by only increasing activity value slightly.
 */
export const nudgeIntelligence = async (userId: string, actionType: 'POST' | 'COMMENT', content: string) => {
  try {
    if (content.length < 50) return; // Ignore small noise

    // We only update the activity timestamp and a tiny increment to activity index
    // We don't change core mapping scores without a Full Analysis.
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    // Silent fail for nudges
  }
};
