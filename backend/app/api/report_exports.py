from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import Response

from app.api.report_sharing import read as shared_report
from app.api.report_tools import owned_report
from app.core.errors import Conflict
from app.services import report_export

router = APIRouter(tags=["Report exports"])
Extension = Literal["pdf", "md"]
ARTIFACT_FIELDS = ("company_name", "company_url", "content", "sources", "model", "finished_at")


def download(document: dict, extension: Extension) -> Response:
    data = report_export.pdf(document) if extension == "pdf" else report_export.markdown(document)
    return Response(
        content=data,
        media_type="application/pdf" if extension == "pdf" else "text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{report_export.filename(document, extension)}"',
            "Cache-Control": "private, no-store",
        },
    )


@router.get("/api/workspaces/{workspace_id}/reports/{report_id}/export/{extension}")
def private_export(extension: Extension, report=Depends(owned_report)):
    if report.status != "SUCCEEDED" or not report.content:
        raise Conflict("Only finished reports can be exported.")
    document = jsonable_encoder({field: getattr(report, field) for field in ARTIFACT_FIELDS})
    return download(document, extension)


@router.get("/api/shared-reports/{token}/export/{extension}")
def public_export(extension: Extension, snapshot: dict = Depends(shared_report)):
    return download(jsonable_encoder(snapshot), extension)
