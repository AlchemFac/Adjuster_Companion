'use strict';

// Original generic scaffolds. No policy rules, findings or completed activities are supplied.
const LIBRARY_CATEGORIES = [
  'Initial claim handling', 'Customer contact', 'Investigation', 'Coverage',
  'Liability', 'Vehicle damage and repairs', 'Follow-ups and resolution',
];
const LIBRARY_SCENARIOS = [
  [0, 'Initial claim review', 'Use to structure an initial file review without inferring missing facts.', 'Review scope', 'REVIEW SCOPE'],
  [0, 'Policy and coverage review', 'Use to record the scope and authorized status of a policy review.', 'Authorized coverage review status', 'COVERAGE REVIEW STATUS'],
  [0, 'Initial liability review', 'Use to organize an initial review without deciding liability.', 'Evidence to review', 'SUPPORTING EVIDENCE'],
  [0, 'New claim action summary', 'Use to summarize only actions you verify were performed.', 'Verified action summary', 'VERIFIED ACTION SUMMARY'],
  [0, 'Outstanding investigation items', 'Use to list information still needed for an investigation.', 'Items requiring investigation', 'INVESTIGATION ITEMS'],
  [1, 'Initial contact attempt', 'Use only after verifying whether and how an initial attempt occurred.', 'Attempt outcome (verify)', 'CONTACT OUTCOME'],
  [1, 'Successful customer contact', 'Use only after verifying that contact occurred and its outcome.', 'Verified contact outcome', 'CONTACT OUTCOME'],
  [1, 'No answer / voicemail left', 'Use only after checking the actual response and voicemail status.', 'Response / voicemail status (verify)', 'VOICEMAIL STATUS'],
  [1, 'Digital statement invitation or follow-up', 'Use to record the verified status of an approved digital request.', 'Digital request status (verify)', 'DIGITAL REQUEST STATUS'],
  [1, 'Request for additional information', 'Use to identify requested material without inventing a request or response.', 'Information requested (verify)', 'REQUESTED INFORMATION'],
  [1, 'Customer callback', 'Use after verifying the callback details and actual discussion.', 'Callback outcome (verify)', 'CALLBACK OUTCOME'],
  [1, 'Unable to contact after multiple attempts', 'Use only after verifying the actual attempt history.', 'Verified attempt history', 'ATTEMPT HISTORY'],
  [2, 'Driver statement summary', 'Use to structure a statement summary from verified source material.', 'Statement source / summary', 'STATEMENT SUMMARY'],
  [2, 'Witness statement summary', 'Use to organize a verified witness account without adding facts.', 'Statement source / summary', 'STATEMENT SUMMARY'],
  [2, 'Police report review', 'Use to record verified report material and remaining questions.', 'Report source / reviewed material', 'REPORT REVIEW'],
  [2, 'Vehicle damage review', 'Use to summarize verified damage information without inferring causation.', 'Damage information reviewed', 'DAMAGE REVIEW'],
  [2, 'Accident scene investigation', 'Use to organize verified scene material, not to infer accident facts.', 'Scene material reviewed', 'SCENE REVIEW'],
  [2, 'Conflicting statements', 'Use to identify verified differences without resolving them automatically.', 'Verified differences / sources', 'STATEMENT DIFFERENCES'],
  [2, 'Additional investigation required', 'Use to list open investigation questions and planned actions.', 'Additional review scope', 'INVESTIGATION SCOPE'],
  [3, 'Coverage verification', 'Use to document an authorized coverage review, not to create a determination.', 'Authorized determination / supporting material', 'DETERMINATION'],
  [3, 'Outstanding coverage questions', 'Use to list unresolved coverage questions for authorized review.', 'Questions for authorized review', 'COVERAGE QUESTIONS'],
  [3, 'Request for coverage documentation', 'Use to describe a verified documentation request and outstanding material.', 'Documentation requested (verify)', 'REQUESTED DOCUMENTATION'],
  [3, 'Coverage review pending', 'Use after verifying the current review status and next action.', 'Verified review status', 'COVERAGE REVIEW STATUS'],
  [3, 'Supervisor review requested', 'Use only after verifying the supervisor request and review scope.', 'Request status (verify)', 'REVIEW REQUEST STATUS'],
  [4, 'Liability investigation pending', 'Use to structure an open investigation without deciding liability.', 'Verified investigation status', 'INVESTIGATION STATUS'],
  [4, 'Liability evidence review', 'Use to organize verified evidence and unresolved questions.', 'Evidence and source references', 'SUPPORTING EVIDENCE'],
  [4, 'Liability determination documented', 'Use only for a determination already made by authorized staff.', 'Authorized determination', 'DETERMINATION'],
  [4, 'Liability decision communicated', 'Use only after verifying the authorized decision and actual communication.', 'Communication status (verify)', 'COMMUNICATION STATUS'],
  [4, 'Disputed liability requiring additional review', 'Use to identify a verified dispute and refer it for further review.', 'Disputed items / review scope', 'DISPUTED ITEMS'],
  [5, 'Repair estimate requested', 'Use after verifying an estimate request and its current status.', 'Estimate request status (verify)', 'ESTIMATE REQUEST STATUS'],
  [5, 'Repair shop follow-up', 'Use to structure a verified shop contact or follow-up.', 'Verified shop update', 'REPAIR SHOP UPDATE'],
  [5, 'Vehicle inspection pending', 'Use after verifying inspection status; do not infer scheduling or approval.', 'Verified inspection status', 'INSPECTION STATUS'],
  [5, 'Supplemental estimate follow-up', 'Use to organize a verified supplement request or review update.', 'Supplement review status', 'SUPPLEMENT STATUS'],
  [5, 'Repair status update', 'Use to record an actual repair update without inventing completion dates.', 'Verified repair status', 'REPAIR STATUS'],
  [5, 'Total loss review referral', 'Use for an authorized review referral, not to classify a vehicle.', 'Verified referral / review status', 'REFERRAL STATUS'],
  [6, 'Follow-up scheduled', 'Use only after verifying the planned follow-up and its date.', 'Scheduling status (verify)', 'FOLLOW-UP STATUS'],
  [6, 'Waiting for customer response', 'Use after checking the actual outstanding request and response status.', 'Verified response status', 'RESPONSE STATUS'],
  [6, 'Waiting for third-party response', 'Use after checking the actual third-party request and response status.', 'Verified response status', 'RESPONSE STATUS'],
  [6, 'Outstanding documentation follow-up', 'Use to list verified missing documentation and a next action.', 'Documentation still needed', 'OUTSTANDING DOCUMENTATION'],
  [6, 'Supervisor escalation', 'Use to describe a verified review request under employer standards.', 'Verified review request / scope', 'REVIEW REQUEST STATUS'],
  [6, 'Claim closure review', 'Use to organize an authorized closure review, not to assert closure.', 'Authorized closure review status', 'CLOSURE REVIEW STATUS'],
];
const BUILTIN_LIBRARY_TEMPLATES = LIBRARY_SCENARIOS.map(([category, title, description, focus, placeholder]) => {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
  const decisionReview = category === 3 || category === 4 || ['Policy and coverage review', 'Initial liability review'].includes(title);
  const contact = category === 1 || title === 'Repair shop follow-up';
  const lines = [
    `${title.toUpperCase()} — TEMPLATE`,
    '', 'Date: [DATE]', 'Time: [TIME]', 'Claim reference: [CLAIM NUMBER]',
    'Purpose: [PURPOSE]', 'Party / role: [PARTY]',
    ...(contact ? ['Contact method (verify): [CONTACT METHOD]'] : []),
    'Action taken (verify): [ACTION TAKEN]',
    `${focus}: [${placeholder}]`,
    'Information received: [INFORMATION RECEIVED]',
    ...(decisionReview ? [
      ...(placeholder !== 'DETERMINATION' ? ['Determination (only if already made by authorized staff): [DETERMINATION]'] : []),
      ...(placeholder !== 'SUPPORTING EVIDENCE' ? ['Supporting evidence / source: [SUPPORTING EVIDENCE]'] : []),
      'Authorized reviewer: [AUTHORIZED REVIEWER]',
    ] : []),
    ...(title.toLowerCase().includes('supervisor') ? ['Supervisor: [SUPERVISOR]'] : []),
    'Outstanding items: [OUTSTANDING ITEMS]', 'Next action: [NEXT ACTION]', 'Follow-up date, if applicable: [FOLLOW-UP DATE]',
  ];
  return Object.freeze({ id, title, category: LIBRARY_CATEGORIES[category], description, body: lines.join('\n') });
});
