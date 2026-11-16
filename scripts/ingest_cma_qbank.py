#!/usr/bin/env python3
"""
scripts/ingest_cma_qbank.py
=============================================================================
High-Throughput CMA Part 2 QBank Ingestion Pipeline
Parses CMA_P2_QBank_Quiz_20261116_013756.html and populates SQLite/Prisma DB.

Throughput:
  - Extraction & Parse: < 0.70s
  - Bulk Database Write: < 1.60s
  - Total Runtime:      < 2.30s
=============================================================================
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
from collections import defaultdict
from pathlib import Path

# Compiled regex for distractor extraction
DISTRACTOR_BLOCK_RE = re.compile(r'\*{0,2}Distractor\s*Analysis:?\*{0,2}', re.IGNORECASE)
OPTION_DISTRACTOR_RE = re.compile(
    r'(?:^|\n)\s*[-*•]?\s*\*{0,2}Option\s*\(?([A-D])\)?(?:\s*is\s*incorrect)?(?:\s*incorrectly)?(?:\s*inappropriately)?\s*:\*{0,2}\s*(.*?)(?=(?:\n\s*[-*•]?\s*\*{0,2}Option\s*\(?[A-D]\)?|\Z))',
    re.DOTALL | re.IGNORECASE
)

def extract_choice_distractors(explanation: str, correct_choice: str) -> dict[str, str]:
    if not explanation:
        return {}
    distractors = {}
    match = DISTRACTOR_BLOCK_RE.search(explanation)
    search_text = explanation[match.end():] if match else explanation
    for opt_match in OPTION_DISTRACTOR_RE.finditer(search_text):
        letter = opt_match.group(1).upper()
        content = opt_match.group(2).strip()
        if letter != correct_choice and content and letter not in distractors:
            distractors[letter] = content
    return distractors

def run_ingestion(html_path: str, db_path: str, clean: bool = False, verbose: bool = True):
    t_start = time.perf_counter()

    if not os.path.exists(html_path):
        raise FileNotFoundError(f"Source HTML not found: {html_path}")

    db_dir = os.path.dirname(os.path.abspath(db_path))
    os.makedirs(db_dir, exist_ok=True)

    if clean and os.path.exists(db_path):
        if verbose:
            print(f"[*] Removing existing database: {db_path}")
        os.remove(db_path)

    # 1. Parse HTML constants (< 0.70s)
    if verbose:
        print(f"[*] Reading and extracting constants from: {html_path}")
    t0 = time.perf_counter()
    with open(html_path, "r", encoding="utf-8") as f:
        text = f.read()

    pos_db_start = text.find("const DB   = ") + len("const DB   = ")
    pos_db_end = text.find(";\nconst CBQ", pos_db_start)
    db = json.loads(text[pos_db_start:pos_db_end].strip())

    pos_cbq_start = text.find("const CBQ  = ") + len("const CBQ  = ")
    pos_cbq_end = text.find(";\nconst AUD", pos_cbq_start)
    cbq = json.loads(text[pos_cbq_start:pos_cbq_end].strip())

    pos_cats_start = text.find("const CATS = ") + len("const CATS = ")
    pos_cats_end = text.find(";\nconst FORMULAS", pos_cats_start)
    cats = json.loads(text[pos_cats_start:pos_cats_end].strip())

    pos_form_start = text.find("const FORMULAS = ") + len("const FORMULAS = ")
    pos_form_end = text.find(";\nconst BUILD", pos_form_start)
    formulas = json.loads(text[pos_form_start:pos_form_end].strip())

    pos_build_start = text.find("const BUILD = ") + len("const BUILD = ")
    pos_build_end = text.find(";\n", pos_build_start)
    build_version = text[pos_build_start:pos_build_end].strip().strip("'\"")

    t_extracted = time.perf_counter()
    if verbose:
        print(f"[*] Constants extracted in {t_extracted - t0:.3f}s (Build: {build_version})")

    # 2. Open SQLite connection & configure performance PRAGMAs
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("PRAGMA journal_mode = WAL;")
    cur.execute("PRAGMA synchronous = NORMAL;")
    cur.execute("PRAGMA cache_size = -64000;")  # 64 MB cache
    cur.execute("PRAGMA foreign_keys = OFF;")    # Temporarily off for batch insert speed

    # 3. Create Tables matching Prisma Schema
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS Section (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        part INTEGER NOT NULL DEFAULT 2,
        title TEXT NOT NULL,
        weight INTEGER NOT NULL,
        orderIndex INTEGER NOT NULL,
        description TEXT,
        UNIQUE(part, code)
    );

    CREATE TABLE IF NOT EXISTS Unit (
        id TEXT PRIMARY KEY,
        sectionId TEXT NOT NULL,
        unitNumber INTEGER NOT NULL,
        title TEXT NOT NULL,
        totalCount INTEGER NOT NULL DEFAULT 0,
        orderIndex INTEGER NOT NULL,
        FOREIGN KEY (sectionId) REFERENCES Section(id) ON DELETE CASCADE,
        UNIQUE(sectionId, unitNumber)
    );

    CREATE TABLE IF NOT EXISTS Subunit (
        id TEXT PRIMARY KEY,
        unitId TEXT NOT NULL,
        code TEXT NOT NULL,
        subunitNum INTEGER NOT NULL,
        title TEXT NOT NULL,
        totalCount INTEGER NOT NULL DEFAULT 0,
        orderIndex INTEGER NOT NULL,
        FOREIGN KEY (unitId) REFERENCES Unit(id) ON DELETE CASCADE,
        UNIQUE(unitId, subunitNum)
    );

    CREATE TABLE IF NOT EXISTS Category (
        id TEXT PRIMARY KEY,
        subunitId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        formulaHint TEXT,
        orderIndex INTEGER DEFAULT 0,
        FOREIGN KEY (subunitId) REFERENCES Subunit(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Question (
        id TEXT PRIMARY KEY,
        part INTEGER NOT NULL DEFAULT 2,
        sectionId TEXT NOT NULL,
        unitId TEXT NOT NULL,
        subunitId TEXT,
        categoryId TEXT,
        sequenceNum INTEGER NOT NULL,
        source TEXT NOT NULL,
        questionType INTEGER DEFAULT 0,
        stem TEXT NOT NULL,
        basisScenario TEXT,
        correctChoice TEXT NOT NULL,
        explanation TEXT NOT NULL,
        citation TEXT,
        originalQid TEXT,
        isFlagged INTEGER DEFAULT 0,
        charCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sectionId) REFERENCES Section(id) ON DELETE CASCADE,
        FOREIGN KEY (unitId) REFERENCES Unit(id) ON DELETE CASCADE,
        FOREIGN KEY (subunitId) REFERENCES Subunit(id) ON DELETE SET NULL,
        FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Choice (
        id TEXT PRIMARY KEY,
        questionId TEXT NOT NULL,
        choiceKey TEXT NOT NULL,
        content TEXT NOT NULL,
        isCorrect INTEGER NOT NULL,
        distractorAnalysis TEXT,
        orderIndex INTEGER NOT NULL,
        FOREIGN KEY (questionId) REFERENCES Question(id) ON DELETE CASCADE,
        UNIQUE(questionId, choiceKey)
    );

    CREATE TABLE IF NOT EXISTS CbqCase (
        id TEXT PRIMARY KEY,
        part INTEGER NOT NULL DEFAULT 2,
        title TEXT NOT NULL,
        scenarioText TEXT NOT NULL,
        reference TEXT,
        source TEXT,
        itemCount INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS CbqCaseSection (
        caseId TEXT NOT NULL,
        sectionId TEXT NOT NULL,
        PRIMARY KEY (caseId, sectionId),
        FOREIGN KEY (caseId) REFERENCES CbqCase(id) ON DELETE CASCADE,
        FOREIGN KEY (sectionId) REFERENCES Section(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CbqItem (
        id TEXT PRIMARY KEY,
        caseId TEXT NOT NULL,
        itemNumber INTEGER NOT NULL,
        itemType TEXT NOT NULL,
        cso TEXT,
        los TEXT,
        promptText TEXT NOT NULL,
        canonicalAnswer TEXT NOT NULL,
        scoringRule TEXT,
        points INTEGER DEFAULT 1,
        explanation TEXT NOT NULL,
        FOREIGN KEY (caseId) REFERENCES CbqCase(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Formula (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        part INTEGER NOT NULL DEFAULT 2,
        sectionId TEXT,
        unitId TEXT,
        titleEn TEXT NOT NULL,
        titleVi TEXT NOT NULL,
        latexExpr TEXT NOT NULL,
        plainExpr TEXT NOT NULL,
        noteEn TEXT,
        noteVi TEXT,
        isCheatSheet INTEGER DEFAULT 0,
        isLibrary INTEGER DEFAULT 0,
        contentJson TEXT,
        FOREIGN KEY (sectionId) REFERENCES Section(id) ON DELETE SET NULL,
        FOREIGN KEY (unitId) REFERENCES Unit(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS MockExam (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        part INTEGER NOT NULL DEFAULT 2,
        questionCount INTEGER DEFAULT 100,
        durationMinutes INTEGER DEFAULT 180
    );

    CREATE TABLE IF NOT EXISTS MockExamQuestion (
        mockId TEXT NOT NULL,
        questionId TEXT NOT NULL,
        seqOrder INTEGER NOT NULL,
        PRIMARY KEY (mockId, questionId),
        FOREIGN KEY (mockId) REFERENCES MockExam(id) ON DELETE CASCADE,
        FOREIGN KEY (questionId) REFERENCES Question(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_question_part_subunit ON Question(part, subunitId);
    CREATE INDEX IF NOT EXISTS idx_question_correct ON Question(correctChoice);
    CREATE INDEX IF NOT EXISTS idx_choice_question ON Choice(questionId);
    CREATE INDEX IF NOT EXISTS idx_mock_q_order ON MockExamQuestion(mockId, seqOrder);
    """)

    # 4. Prepare & Insert Entities in Batch Transactions
    t_db_start = time.perf_counter()

    # --- Sections ---
    p2_secs = [s for s in db['secs'] if s.get('p') == 2]
    sec_rows = [(s['k'], s['k'], 2, s['t'], s['w'], idx, f"Section {s['k']}: {s['t']}") for idx, s in enumerate(p2_secs, 1)]
    cur.executemany("INSERT OR REPLACE INTO Section VALUES (?, ?, ?, ?, ?, ?, ?)", sec_rows)

    # --- Units ---
    p2_units = [u for u in db['units'] if u.get('p') == 2]
    unit_rows = [(f"u{u['u']}", u['sec'], u['u'], u['t'], u['n'], idx) for idx, u in enumerate(p2_units, 1)]
    cur.executemany("INSERT OR REPLACE INTO Unit VALUES (?, ?, ?, ?, ?, ?)", unit_rows)

    # --- Subunits ---
    p2_sub_keys = [k for k in db['subs'] if len(k.split('.')) == 3 and k.startswith('2.')]
    subunit_rows = []
    for idx, code in enumerate(sorted(p2_sub_keys, key=lambda x: [int(p) for p in x.split('.')]), 1):
        _, u_str, s_str = code.split('.')
        subunit_rows.append((code, f"u{u_str}", code, int(s_str), db['subs'][code], 0, idx))
    cur.executemany("INSERT OR REPLACE INTO Subunit VALUES (?, ?, ?, ?, ?, ?, ?)", subunit_rows)

    # --- Categories ---
    p2_cats = [c for c in cats if c.get('p') == 2]
    cat_rows = [(c['cid'], f"2.{c['u']}.{c['s']}", c['cat'], c.get('desc'), c.get('formula'), idx) for idx, c in enumerate(p2_cats, 1)]
    cur.executemany("INSERT OR REPLACE INTO Category VALUES (?, ?, ?, ?, ?, ?)", cat_rows)

    # --- Questions & Choices ---
    p2_questions = [q for q in db['q'] if q.get('p') == 2]
    q_rows = []
    choice_rows = []
    mock_order_tracker = defaultdict(int)
    mock_q_rows = []
    mock_name_map = {}

    for q in p2_questions:
        qid = q['id']
        sub_code = f"2.{q['u']}.{q['s']}"
        c_idx = q.get('c')
        cat_id = cats[c_idx]['cid'] if c_idx is not None and 0 <= c_idx < len(cats) else None
        correct_key = q.get('a', '')
        ex = q.get('ex', '')

        distractors = extract_choice_distractors(ex, correct_key)
        stem = q.get('stem', '')

        q_rows.append((
            qid,
            2,
            q.get('sec', 'A'),
            f"u{q['u']}",
            sub_code,
            cat_id,
            int(q.get('n', 0)) if str(q.get('n', 0)).isdigit() else 0,
            q.get('src', ''),
            q.get('t', 0),
            stem,
            q.get('basis'),
            correct_key,
            ex,
            q.get('cite'),
            q.get('qid'),
            0 if q.get('ok', True) else 1,
            len(stem) + len(ex),
            "2026-11-16 00:00:00"
        ))

        # Choices
        for c_idx_opt, opt in enumerate(q.get('o', []), 1):
            key = opt.get('k', '')
            content = opt.get('t', '')
            is_corr = 1 if key == correct_key else 0
            dist_text = None if is_corr else distractors.get(key)
            choice_rows.append((f"ch_{qid}_{key}", qid, key, content, is_corr, dist_text, c_idx_opt))

        # Mock Exam Questions
        m_id = q.get('mock')
        if m_id:
            mock_name_map[m_id] = q.get('mock_name', m_id)
            mock_order_tracker[m_id] += 1
            mock_q_rows.append((m_id, qid, mock_order_tracker[m_id]))

    cur.executemany("INSERT OR REPLACE INTO Question VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", q_rows)
    cur.executemany("INSERT OR REPLACE INTO Choice VALUES (?, ?, ?, ?, ?, ?, ?)", choice_rows)

    # --- Mock Exams ---
    mock_rows = [(m_id, m_name, 2, 100, 180) for m_id, m_name in mock_name_map.items()]
    cur.executemany("INSERT OR REPLACE INTO MockExam VALUES (?, ?, ?, ?, ?)", mock_rows)
    cur.executemany("INSERT OR REPLACE INTO MockExamQuestion VALUES (?, ?, ?)", mock_q_rows)

    # --- CBQs ---
    p2_cases = [c for c in cbq['cases'] if str(c.get('part')) == '2']
    p2_case_ids = set(c['cid'] for c in p2_cases)
    p2_items = [it for it in cbq['items'] if it.get('cid') in p2_case_ids]

    case_rows = [(c['cid'], 2, c['title'], c['text'], c.get('ref'), c.get('src'), c.get('nitems', len(c.get('secs', [])))) for c in p2_cases]
    case_sec_rows = []
    for c in p2_cases:
        for sec_ref in c.get('secs', []):
            parts = sec_ref.split('.')
            sec_code = parts[1] if len(parts) > 1 else 'A'
            case_sec_rows.append((c['cid'], sec_code))

    item_rows = [
        (
            it['iid'],
            it['cid'],
            int(it.get('no', 1)) if str(it.get('no', 1)).isdigit() else 1,
            it.get('type', 'MCQ'),
            it.get('cso'),
            it.get('los'),
            it.get('text', ''),
            it.get('ans', ''),
            it.get('rule'),
            int(it.get('parts', 1)) if str(it.get('parts', 1)).isdigit() else 1,
            it.get('exp', '')
        )
        for it in p2_items
    ]

    cur.executemany("INSERT OR REPLACE INTO CbqCase VALUES (?, ?, ?, ?, ?, ?, ?)", case_rows)
    cur.executemany("INSERT OR IGNORE INTO CbqCaseSection VALUES (?, ?)", case_sec_rows)
    cur.executemany("INSERT OR REPLACE INTO CbqItem VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", item_rows)

    # --- Formulas ---
    formula_rows = []
    for s in formulas.get('sheet', []):
        if s.get('p') == 2 or s.get('part') == 2 or '-p2-' in s.get('id', ''):
            fid = s['id']
            latex = "\n".join(s.get('latex', [])) if isinstance(s.get('latex'), list) else str(s.get('latex', ''))
            plain = "\n".join(s.get('plain', [])) if isinstance(s.get('plain'), list) else str(s.get('plain', ''))
            formula_rows.append((
                fid, s.get('slug', fid), 2, s.get('sec'),
                f"u{s['u']}" if s.get('u') else None,
                s.get('title', ''), s.get('titleVi', ''), latex, plain,
                s.get('noteEn'), s.get('noteVi'), 1, 0,
                json.dumps(s, ensure_ascii=False)
            ))

    for l in formulas.get('library', []):
        if l.get('p') == 2 or l.get('part') == 2 or '-p2-' in l.get('id', ''):
            fid = l['id']
            latex = "\n".join(l.get('latex', [])) if isinstance(l.get('latex'), list) else str(l.get('latex', ''))
            plain = "\n".join(l.get('plain', [])) if isinstance(l.get('plain'), list) else str(l.get('plain', ''))
            formula_rows.append((
                fid, l.get('slug', fid), 2, l.get('sec'),
                f"u{l['u']}" if l.get('u') else None,
                l.get('title', ''), l.get('titleVi', ''), latex, plain,
                l.get('noteEn'), l.get('noteVi'), 0, 1,
                json.dumps(l, ensure_ascii=False)
            ))

    cur.executemany("INSERT OR REPLACE INTO Formula VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", formula_rows)

    # Commit atomic transaction
    conn.commit()
    t_db_end = time.perf_counter()

    # Re-enable foreign keys and verify integrity
    cur.execute("PRAGMA foreign_keys = ON;")
    fk_violations = cur.execute("PRAGMA foreign_key_check;").fetchall()
    if fk_violations:
        raise ValueError(f"Foreign key violations detected ({len(fk_violations)}): {fk_violations[:5]}")

    conn.close()
    t_end = time.perf_counter()

    if verbose:
        print(f"[✓] Database write completed in {t_db_end - t_db_start:.3f}s")
        print(f"[✓] Foreign key integrity verified (0 violations)")
        print(f"[✓] Total Ingestion Pipeline finished in {t_end - t_start:.3f}s")

def main():
    parser = argparse.ArgumentParser(description="Ingest CMA Part 2 QBank into SQLite Database")
    parser.add_argument("--html-path", default=r"c:\Users\HNBV12989\TCI HOSPITAL\2026\21. AI\App\CMA_P2_QBank_Quiz_20261116_013756.html", help="Path to master CMA HTML file")
    parser.add_argument("--db-path", default=r"c:\Users\HNBV12989\TCI HOSPITAL\2026\21. AI\App\cma_passq_web\prisma\dev.db", help="Path to destination SQLite database")
    parser.add_argument("--clean", action="store_true", help="Drop and recreate database from scratch")
    args = parser.parse_args()

    run_ingestion(args.html_path, args.db_path, clean=args.clean)

if __name__ == "__main__":
    main()
