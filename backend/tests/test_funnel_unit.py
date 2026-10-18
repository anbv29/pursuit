from app.services.funnel import analyze, parse_csv


def test_parse_valid_csv_and_analyze():
    res = parse_csv(b"stage,count\nVisitors,10000\nSignups,800\nActivated,200\nPaid,60\n")
    assert res.errors == [] and len(res.stages) == 4
    a = analyze(res.stages)
    assert a["steps"][0]["conversion"]["value"] == 0.08
    assert a["bottleneck"]["from"] == "Visitors"  # 8% is the weakest step
    assert a["overall"]["value"] == 0.006
    assert len(a["explanations"]) == 4


def test_parse_reports_row_errors():
    res = parse_csv(b"stage,count\nVisitors,abc\n=HYPERLINK(1),5\nSignups,-3\n")
    assert any("Row 2" in e for e in res.errors)
    assert any("Row 3" in e for e in res.errors)  # CSV formula injection rejected
    assert any("Row 4" in e for e in res.errors)


def test_parse_rejects_bad_header_and_size():
    assert parse_csv(b"name,value\na,1\nb,2").errors
    assert parse_csv(b"x" * 100_001).errors


def test_increasing_stage_is_warning_not_error():
    res = parse_csv(b"stage,count\nA,10\nB,20\n")
    assert res.errors == [] and res.warnings


def test_zero_top_of_funnel():
    a = analyze([{"name": "A", "count": 0}, {"name": "B", "count": 0}])
    assert a["bottleneck"] is None and a["overall"]["value"] is None
