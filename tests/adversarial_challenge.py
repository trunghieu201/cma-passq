#!/usr/bin/env python3
"""
tests/adversarial_challenge.py
=============================================================================
EMPIRICAL ADVERSARIAL CHALLENGER TEST HARNESS — MILESTONE 1
=============================================================================
This test harness performs empirical verification of the SQLite database:
1. Sampling Verification: Compares 200 randomly sampled questions across all
   6 sections (A, B, C, D, E, F) against the ground-truth JSON in the master HTML.
2. Distractor Analysis Integrity: Exhaustively verifies distractor analyses
   across all 30,436 choices (no correct choice has distractor, distractor letters match).
3. Referential Integrity & Orphan Audit: Verifies foreign keys, orphan choices,
   orphan subunits, empty/invalid mock exams, and CBQ linkages.
4. Concurrency & Performance Benchmark: Fires 50 concurrent worker threads
   performing 500 multi-table random question queries in SQLite WAL mode.
   Enforces < 15ms latency per query and zero lock errors.
5. Edge Case Stress: Verifies math symbols, Unicode Vietnamese characters,
   formula expressions, and non-empty content.
=============================================================================
"""

import concurrent.futures
import json
import os
import random
import re
import sqlite3
import sys
import threading
import time
from collections import defaultdict
from typing import Any, Dict, List, Tuple

HTML_PATH = r"c:\Users\HNBV12989\TCI HOSPITAL\2026\21. AI\App\CMA_P2_QBank_Quiz_20261116_013756.html"
DB_PATH = r"c:\Users\HNBV12989\TCI HOSPITAL\2026\21. AI\App\cma_passq_web\prisma\dev.db"

class AdversarialChallengeSuite:
    def __init__(self, html_path: str, db_path: str):
        self.html_path = html_path
        self.db_path = db_path
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_reports: List[Dict[str, Any]] = []

    def record_test(self, name: str, passed: bool, details: str = "", metrics: Dict[str, Any] = None):
        status = "PASS" if passed else "FAIL"
        if passed:
            self.passed_tests += 1
            print(f"  [✓ PASS] {name} - {details}")
        else:
            self.failed_tests += 1
            print(f"  [✗ FAIL] {name} - {details}", file=sys.stderr)
        self.test_reports.append({
            "name": name,
            "status": status,
            "details": details,
            "metrics": metrics or {}
        })

    def load_html_constants(self) -> Dict[str, Any]:
        print("[*] Extracting ground truth JSON constants from source HTML...")
        t0 = time.perf_counter()
        with open(self.html_path, "r", encoding="utf-8") as f:
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

        t1 = time.perf_counter()
        print(f"[*] Ground truth constants loaded in {t1 - t0:.3f}s")
        return {"db": db, "cbq": cbq, "cats": cats, "formulas": formulas}

    # =========================================================================
    # SUITE 1: Sampling Verification across Sections A-F
    # =========================================================================
    def run_suite_1_sampling(self, ground_truth: Dict[str, Any]):
        print("\n=== SUITE 1: Adversarial Random Sampling Against HTML Source ===")
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        p2_questions = [q for q in ground_truth['db']['q'] if q.get('p') == 2]
        self.record_test("HTML Source Total Part 2 Questions", len(p2_questions) == 7609, f"Found {len(p2_questions)}")

        # Group by section
        by_sec: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for q in p2_questions:
            by_sec[q.get('sec', 'Unknown')].append(q)

        all_sections = sorted(by_sec.keys())
        self.record_test("Sections Represented in HTML (A..F)", all_sections == ['A', 'B', 'C', 'D', 'E', 'F'], f"Sections: {all_sections}")

        # Deterministic sample 25 per section = 150 questions total + 50 random unseeded
        rng = random.Random(42)
        sampled_questions: List[Dict[str, Any]] = []
        for sec in ['A', 'B', 'C', 'D', 'E', 'F']:
            sec_qs = by_sec[sec]
            k = min(25, len(sec_qs))
            sampled_questions.extend(rng.sample(sec_qs, k))

        # Add 50 more unseeded questions across all sections
        sampled_ids = set(q['id'] for q in sampled_questions)
        remaining = [q for q in p2_questions if q['id'] not in sampled_ids]
        sampled_questions.extend(random.sample(remaining, 50))

        self.record_test("Sample Size >= 100", len(sampled_questions) >= 100, f"Sampled {len(sampled_questions)} questions across all 6 sections")

        stem_mismatches = []
        option_mismatches = []
        answer_mismatches = []
        explanation_mismatches = []
        subunit_mismatches = []
        citation_mismatches = []
        basis_mismatches = []

        for q in sampled_questions:
            qid = q['id']
            row = cur.execute(
                "SELECT stem, correctChoice, explanation, subunitId, basisScenario, citation FROM Question WHERE id = ?",
                (qid,)
            ).fetchone()

            if not row:
                stem_mismatches.append(f"{qid}: Not found in DB")
                continue

            db_stem, db_correct, db_exp, db_subunit, db_basis, db_cite = row

            if db_stem != q.get('stem', ''):
                stem_mismatches.append(f"{qid}: Stem mismatch")
            if db_correct != q.get('a', ''):
                answer_mismatches.append(f"{qid}: Expected correct {q.get('a')}, got {db_correct}")
            if db_exp != q.get('ex', ''):
                explanation_mismatches.append(f"{qid}: Explanation mismatch")

            expected_subunit = f"2.{q.get('u')}.{q.get('s')}"
            if db_subunit != expected_subunit:
                subunit_mismatches.append(f"{qid}: Expected subunit {expected_subunit}, got {db_subunit}")

            if db_cite != q.get('cite'):
                citation_mismatches.append(f"{qid}: Expected cite {q.get('cite')}, got {db_cite}")

            if db_basis != q.get('basis'):
                basis_mismatches.append(f"{qid}: Expected basis {q.get('basis')}, got {db_basis}")

            # Verify choices
            db_choices = cur.execute(
                "SELECT choiceKey, content, isCorrect FROM Choice WHERE questionId = ? ORDER BY orderIndex",
                (qid,)
            ).fetchall()

            raw_opts = q.get('o', [])
            if len(db_choices) != len(raw_opts):
                option_mismatches.append(f"{qid}: Choice count mismatch (DB: {len(db_choices)}, Raw: {len(raw_opts)})")
                continue

            for idx, raw_opt in enumerate(raw_opts):
                ch_key, ch_content, ch_corr = db_choices[idx]
                if ch_key != raw_opt.get('k'):
                    option_mismatches.append(f"{qid}: Choice key mismatch at {idx}")
                if ch_content != raw_opt.get('t'):
                    option_mismatches.append(f"{qid}: Choice content mismatch for key {ch_key}")
                expected_corr = 1 if raw_opt.get('k') == q.get('a') else 0
                if ch_corr != expected_corr:
                    answer_mismatches.append(f"{qid}: Choice {ch_key} isCorrect expected {expected_corr}, got {ch_corr}")

        self.record_test("Sample Question Stems 100% Match", len(stem_mismatches) == 0, f"{len(stem_mismatches)} mismatches")
        self.record_test("Sample Answer Choices 100% Match", len(option_mismatches) == 0, f"{len(option_mismatches)} mismatches")
        self.record_test("Sample Correct Answers 100% Match", len(answer_mismatches) == 0, f"{len(answer_mismatches)} mismatches")
        self.record_test("Sample Explanations 100% Match", len(explanation_mismatches) == 0, f"{len(explanation_mismatches)} mismatches")
        self.record_test("Sample Subunit IDs 100% Match", len(subunit_mismatches) == 0, f"{len(subunit_mismatches)} mismatches")
        self.record_test("Sample Basis Scenarios 100% Match", len(basis_mismatches) == 0, f"{len(basis_mismatches)} mismatches")
        self.record_test("Sample Citations 100% Match", len(citation_mismatches) == 0, f"{len(citation_mismatches)} mismatches")
        conn.close()

    # =========================================================================
    # SUITE 2: Distractor Analysis Integrity
    # =========================================================================
    def run_suite_2_distractor_integrity(self):
        print("\n=== SUITE 2: Distractor Analysis Integrity ===")
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        # 1. Total distractor analyses count
        total_dist = cur.execute("SELECT count(*) FROM Choice WHERE distractorAnalysis IS NOT NULL").fetchone()[0]
        self.record_test("Distractor Analyses Ingested >= 13,150", total_dist >= 13150, f"Found {total_dist} distractor analyses")

        # 2. Critical: NO choice with isCorrect == 1 has distractorAnalysis
        cor_with_dist = cur.execute("SELECT count(*) FROM Choice WHERE isCorrect = 1 AND distractorAnalysis IS NOT NULL").fetchone()[0]
        self.record_test("No Correct Choice Has Distractor Analysis", cor_with_dist == 0, f"Found {cor_with_dist} violations")

        # 3. Check for empty string distractor analyses
        empty_dist = cur.execute("SELECT count(*) FROM Choice WHERE distractorAnalysis = ''").fetchone()[0]
        self.record_test("No Empty String Distractor Analyses", empty_dist == 0, f"Found {empty_dist} empty strings")

        # 4. Distractor Letter Correspondence Test:
        # Check choices where distractor analysis was extracted:
        # Does the distractor analysis match the choice key?
        # Specifically, check against the raw explanation regex parsing:
        dist_rows = cur.execute("""
            SELECT c.questionId, c.choiceKey, c.distractorAnalysis, q.explanation, q.correctChoice
            FROM Choice c
            JOIN Question q ON c.questionId = q.id
            WHERE c.distractorAnalysis IS NOT NULL
        """).fetchall()

        distractor_block_re = re.compile(r'\*{0,2}Distractor\s*Analysis:?\*{0,2}', re.IGNORECASE)
        option_re = re.compile(
            r'(?:^|\n)\s*[-*•]?\s*\*{0,2}Option\s*\(?([A-D])\)?(?:\s*is\s*incorrect)?(?:\s*incorrectly)?(?:\s*inappropriately)?\s*:\*{0,2}\s*(.*?)(?=(?:\n\s*[-*•]?\s*\*{0,2}Option\s*\(?[A-D]\)?|\Z))',
            re.DOTALL | re.IGNORECASE
        )

        letter_mismatches = []
        for qid, key, dist_text, explanation, correct_key in dist_rows:
            # Re-parse explanation directly with oracle
            m = distractor_block_re.search(explanation)
            search_text = explanation[m.end():] if m else explanation
            found_distractors = {}
            for opt_m in option_re.finditer(search_text):
                letter = opt_m.group(1).upper()
                content = opt_m.group(2).strip()
                if letter != correct_key and content and letter not in found_distractors:
                    found_distractors[letter] = content

            if key not in found_distractors:
                letter_mismatches.append(f"{qid}: Key {key} had distractor in DB but not found in oracle re-parse")
            elif found_distractors[key] != dist_text:
                letter_mismatches.append(f"{qid}: Key {key} distractor content differed from oracle re-parse")

        self.record_test("Distractor Analyses Letters Exactly Match Oracle Choices", len(letter_mismatches) == 0, f"{len(letter_mismatches)} mismatches across {len(dist_rows)} checked")
        conn.close()

    # =========================================================================
    # SUITE 3: Referential Integrity & Orphan Audit
    # =========================================================================
    def run_suite_3_referential_integrity(self):
        print("\n=== SUITE 3: Referential Integrity & Orphan Detection ===")
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        # 1. SQLite PRAGMA foreign_key_check
        cur.execute("PRAGMA foreign_keys = ON;")
        fk_violations = cur.execute("PRAGMA foreign_key_check;").fetchall()
        self.record_test("PRAGMA foreign_key_check Clean", len(fk_violations) == 0, f"Violations: {len(fk_violations)}")

        # 2. Orphan Choices (choices referencing non-existent questions)
        orphan_choices = cur.execute("""
            SELECT count(*) FROM Choice c
            LEFT JOIN Question q ON c.questionId = q.id
            WHERE q.id IS NULL
        """).fetchone()[0]
        self.record_test("Zero Orphan Choices", orphan_choices == 0, f"Found {orphan_choices} orphan choices")

        # 3. Exactly 4 choices per question
        invalid_choice_counts = cur.execute("""
            SELECT count(*) FROM (
                SELECT questionId, count(*) as cnt FROM Choice GROUP BY questionId HAVING cnt != 4
            )
        """).fetchone()[0]
        self.record_test("Every Question Has Exactly 4 Choices", invalid_choice_counts == 0, f"Found {invalid_choice_counts} invalid question choice counts")

        # 4. Exactly 1 correct choice per question
        invalid_correct_counts = cur.execute("""
            SELECT count(*) FROM (
                SELECT questionId, sum(isCorrect) as cnt FROM Choice GROUP BY questionId HAVING cnt != 1
            )
        """).fetchone()[0]
        self.record_test("Every Question Has Exactly 1 Correct Choice", invalid_correct_counts == 0, f"Found {invalid_correct_counts} invalid questions")

        # 5. Orphan Subunits (subunits referencing non-existent units)
        orphan_subunits = cur.execute("""
            SELECT count(*) FROM Subunit s
            LEFT JOIN Unit u ON s.unitId = u.id
            WHERE u.id IS NULL
        """).fetchone()[0]
        self.record_test("Zero Orphan Subunits (Missing Unit FK)", orphan_subunits == 0, f"Found {orphan_subunits} orphan subunits")

        # 6. Orphan Units (units referencing non-existent sections)
        orphan_units = cur.execute("""
            SELECT count(*) FROM Unit u
            LEFT JOIN Section s ON u.sectionId = s.id
            WHERE s.id IS NULL
        """).fetchone()[0]
        self.record_test("Zero Orphan Units (Missing Section FK)", orphan_units == 0, f"Found {orphan_units} orphan units")

        # 7. Subunits with Zero Questions
        subunits_zero_q = cur.execute("""
            SELECT s.id, s.title FROM Subunit s
            LEFT JOIN Question q ON s.id = q.subunitId
            GROUP BY s.id
            HAVING count(q.id) = 0
        """).fetchall()
        self.record_test("Zero Subunits with 0 Questions", len(subunits_zero_q) == 0, f"Found {len(subunits_zero_q)} empty subunits: {[s[0] for s in subunits_zero_q]}")

        # 8. Empty or Invalid Mock Exams
        mock_count = cur.execute("SELECT count(*) FROM MockExam").fetchone()[0]
        self.record_test("Mock Exams Count == 31", mock_count == 31, f"Found {mock_count}")

        empty_mocks = cur.execute("""
            SELECT m.id, count(mq.questionId) as qcnt
            FROM MockExam m
            LEFT JOIN MockExamQuestion mq ON m.id = mq.mockId
            GROUP BY m.id
            HAVING qcnt != 100
        """).fetchall()
        self.record_test("All 31 Mock Exams Have Exactly 100 Questions", len(empty_mocks) == 0, f"Mocks with != 100 questions: {len(empty_mocks)}")

        # 9. Orphan Mock Questions (referencing non-existent questions)
        orphan_mock_q = cur.execute("""
            SELECT count(*) FROM MockExamQuestion mq
            LEFT JOIN Question q ON mq.questionId = q.id
            WHERE q.id IS NULL
        """).fetchone()[0]
        self.record_test("Zero Orphan MockExamQuestions", orphan_mock_q == 0, f"Found {orphan_mock_q}")

        # 10. CBQ Referential Integrity
        orphan_cbq_items = cur.execute("""
            SELECT count(*) FROM CbqItem i
            LEFT JOIN CbqCase c ON i.caseId = c.id
            WHERE c.id IS NULL
        """).fetchone()[0]
        self.record_test("Zero Orphan CBQ Items", orphan_cbq_items == 0, f"Found {orphan_cbq_items}")

        orphan_cbq_secs = cur.execute("""
            SELECT count(*) FROM CbqCaseSection cs
            LEFT JOIN Section s ON cs.sectionId = s.id
            WHERE s.id IS NULL
        """).fetchone()[0]
        self.record_test("Zero Orphan CBQ Section Links", orphan_cbq_secs == 0, f"Found {orphan_cbq_secs}")

        conn.close()

    # =========================================================================
    # SUITE 4: Performance & Concurrency Benchmark
    # =========================================================================
    def run_suite_4_concurrency_benchmark(self):
        print("\n=== SUITE 4: Concurrency & Latency Benchmark (50 Concurrent Threads) ===")
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        # Check WAL mode
        journal_mode = cur.execute("PRAGMA journal_mode;").fetchone()[0]
        conn.close()
        self.record_test("SQLite Database is in WAL Mode", journal_mode.lower() == "wal", f"journal_mode: {journal_mode}")

        # Fetch list of all question IDs to sample randomly during concurrent execution
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        all_qids = [r[0] for r in cur.execute("SELECT id FROM Question").fetchall()]
        conn.close()

        num_threads = 50
        queries_per_thread = 10
        total_queries = num_threads * queries_per_thread

        # Part A: Core Question Query (Question + 4 Choices)
        core_latencies_ms: List[float] = []
        core_lock_errors: List[str] = []
        thread_lock = threading.Lock()

        def worker_core_query_job(worker_id: int):
            local_rng = random.Random(worker_id * 1000 + 7)
            try:
                local_conn = sqlite3.connect(self.db_path, timeout=10.0)
                local_conn.execute("PRAGMA synchronous = NORMAL;")
                local_conn.execute("PRAGMA cache_size = -16000;")
                local_cur = local_conn.cursor()

                for _ in range(queries_per_thread):
                    target_qid = local_rng.choice(all_qids)
                    
                    t0 = time.perf_counter()
                    rows = local_cur.execute("""
                        SELECT 
                            q.id, q.stem, q.correctChoice, q.explanation,
                            c.choiceKey, c.content, c.isCorrect, c.distractorAnalysis
                        FROM Question q
                        JOIN Choice c ON q.id = c.questionId
                        WHERE q.id = ?;
                    """, (target_qid,)).fetchall()
                    t1 = time.perf_counter()

                    dur_ms = (t1 - t0) * 1000.0
                    with thread_lock:
                        core_latencies_ms.append(dur_ms)

                local_conn.close()
            except Exception as e:
                with thread_lock:
                    core_lock_errors.append(f"Worker {worker_id}: {type(e).__name__} - {e}")

        t_core_start = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(worker_core_query_job, i) for i in range(num_threads)]
            concurrent.futures.wait(futures)
        t_core_end = time.perf_counter()

        core_duration = t_core_end - t_core_start
        core_qps = total_queries / core_duration if core_duration > 0 else 0

        self.record_test("Zero Database Lock Errors (Core Random Question)", len(core_lock_errors) == 0, f"Errors: {len(core_lock_errors)}")

        if core_latencies_ms:
            core_latencies_ms.sort()
            avg_ms = sum(core_latencies_ms) / len(core_latencies_ms)
            p50_ms = core_latencies_ms[int(len(core_latencies_ms) * 0.50)]
            p95_ms = core_latencies_ms[int(len(core_latencies_ms) * 0.95)]
            p99_ms = core_latencies_ms[int(len(core_latencies_ms) * 0.99)]
            max_ms = max(core_latencies_ms)
            min_ms = min(core_latencies_ms)

            metrics = {
                "total_queries": len(core_latencies_ms),
                "concurrent_threads": num_threads,
                "bench_duration_s": round(core_duration, 3),
                "throughput_qps": round(core_qps, 1),
                "avg_ms": round(avg_ms, 2),
                "p50_ms": round(p50_ms, 2),
                "p95_ms": round(p95_ms, 2),
                "p99_ms": round(p99_ms, 2),
                "min_ms": round(min_ms, 2),
                "max_ms": round(max_ms, 2)
            }

            self.record_test(
                "Core Random Question Latency < 15ms (Avg)",
                avg_ms < 15.0,
                f"Avg: {avg_ms:.2f}ms, P50: {p50_ms:.2f}ms, P95: {p95_ms:.2f}ms, P99: {p99_ms:.2f}ms",
                metrics=metrics
            )
            self.record_test(
                "Core Random Question Latency < 15ms (P95)",
                p95_ms < 15.0,
                f"P95: {p95_ms:.2f}ms (Target: < 15ms)",
                metrics=metrics
            )
            print(f"  [METRIC] Core Concurrency Throughput: {core_qps:.1f} queries/sec across {num_threads} threads")

        # Part B: Full Multi-Table Join Query (Question + Choices + Subunit + Unit + Section)
        full_latencies_ms: List[float] = []
        full_lock_errors: List[str] = []

        def worker_full_query_job(worker_id: int):
            local_rng = random.Random(worker_id * 2000 + 13)
            try:
                local_conn = sqlite3.connect(self.db_path, timeout=10.0)
                local_conn.execute("PRAGMA synchronous = NORMAL;")
                local_conn.execute("PRAGMA cache_size = -16000;")
                local_cur = local_conn.cursor()

                for _ in range(queries_per_thread):
                    target_qid = local_rng.choice(all_qids)
                    
                    t0 = time.perf_counter()
                    rows = local_cur.execute("""
                        SELECT 
                            q.id, q.stem, q.correctChoice, q.explanation,
                            s.code as secCode, s.title as secTitle,
                            u.unitNumber, u.title as unitTitle,
                            su.code as subCode, su.title as subTitle,
                            c.choiceKey, c.content, c.isCorrect, c.distractorAnalysis
                        FROM Question q
                        JOIN Section s ON q.sectionId = s.id
                        JOIN Unit u ON q.unitId = u.id
                        JOIN Subunit su ON q.subunitId = su.id
                        JOIN Choice c ON q.id = c.questionId
                        WHERE q.id = ?;
                    """, (target_qid,)).fetchall()
                    t1 = time.perf_counter()

                    dur_ms = (t1 - t0) * 1000.0
                    with thread_lock:
                        full_latencies_ms.append(dur_ms)

                local_conn.close()
            except Exception as e:
                with thread_lock:
                    full_lock_errors.append(f"Worker {worker_id}: {type(e).__name__} - {e}")

        t_full_start = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(worker_full_query_job, i) for i in range(num_threads)]
            concurrent.futures.wait(futures)
        t_full_end = time.perf_counter()

        full_duration = t_full_end - t_full_start
        full_qps = total_queries / full_duration if full_duration > 0 else 0

        self.record_test("Zero Database Lock Errors (Full Join Question)", len(full_lock_errors) == 0, f"Errors: {len(full_lock_errors)}")

        if full_latencies_ms:
            full_latencies_ms.sort()
            avg_ms = sum(full_latencies_ms) / len(full_latencies_ms)
            p50_ms = full_latencies_ms[int(len(full_latencies_ms) * 0.50)]
            p95_ms = full_latencies_ms[int(len(full_latencies_ms) * 0.95)]
            p99_ms = full_latencies_ms[int(len(full_latencies_ms) * 0.99)]

            metrics_full = {
                "total_queries": len(full_latencies_ms),
                "concurrent_threads": num_threads,
                "bench_duration_s": round(full_duration, 3),
                "throughput_qps": round(full_qps, 1),
                "avg_ms": round(avg_ms, 2),
                "p50_ms": round(p50_ms, 2),
                "p95_ms": round(p95_ms, 2),
                "p99_ms": round(p99_ms, 2),
            }

            self.record_test(
                "Full Multi-Table Join Latency < 15ms (Avg)",
                avg_ms < 15.0,
                f"Avg: {avg_ms:.2f}ms, P50: {p50_ms:.2f}ms, P95: {p95_ms:.2f}ms, P99: {p99_ms:.2f}ms",
                metrics=metrics_full
            )
            print(f"  [METRIC] Full Join Concurrency Throughput: {full_qps:.1f} queries/sec across {num_threads} threads")

    # =========================================================================
    # SUITE 5: Boundary & Schema Fidelity
    # =========================================================================
    def run_suite_5_boundary_and_fidelity(self):
        print("\n=== SUITE 5: Boundary & Schema Fidelity ===")
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        # 1. Total records count in database
        tables = [
            "Section", "Unit", "Subunit", "Category", "Question", "Choice",
            "CbqCase", "CbqCaseSection", "CbqItem", "Formula",
            "MockExam", "MockExamQuestion"
        ]
        counts = {}
        for t in tables:
            cnt = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
            counts[t] = cnt

        self.record_test("All 12 Ingestion Tables Non-Empty", all(c > 0 for c in counts.values()), f"Counts: {counts}")

        # 2. Total questions count
        self.record_test("Total Question Bank == 7,609", counts["Question"] == 7609, f"Question count: {counts['Question']}")
        self.record_test("Total Choices == 30,436", counts["Choice"] == 30436, f"Choice count: {counts['Choice']}")

        # 3. Unicode and special characters preserved
        formula_titles = cur.execute("SELECT titleVi FROM Formula").fetchall()
        viet_count = sum(1 for row in formula_titles if any(ord(c) > 127 for c in (row[0] or '')))
        self.record_test("Vietnamese Diacritics Preserved in Formulas", viet_count == len(formula_titles) and viet_count == 302, f"Found {viet_count} of {len(formula_titles)} formulas")

        latex_formulas = cur.execute("SELECT count(*) FROM Formula WHERE latexExpr LIKE '%\\frac%' OR latexExpr LIKE '%\\times%' OR latexExpr LIKE '%=%'").fetchone()[0]
        self.record_test("LaTeX Math Formulas Preserved", latex_formulas > 100, f"Found {latex_formulas} LaTeX expressions")

        conn.close()

    def run_all(self):
        t_all_start = time.perf_counter()
        ground_truth = self.load_html_constants()

        self.run_suite_1_sampling(ground_truth)
        self.run_suite_2_distractor_integrity()
        self.run_suite_3_referential_integrity()
        self.run_suite_4_concurrency_benchmark()
        self.run_suite_5_boundary_and_fidelity()

        t_all_end = time.perf_counter()
        print("\n" + "=" * 60)
        print(f"ADVERSARIAL VERIFICATION SUMMARY: {self.passed_tests} PASSED, {self.failed_tests} FAILED in {t_all_end - t_all_start:.2f}s")
        print("=" * 60)

        return self.failed_tests == 0

if __name__ == "__main__":
    suite = AdversarialChallengeSuite(HTML_PATH, DB_PATH)
    success = suite.run_all()
    sys.exit(0 if success else 1)
