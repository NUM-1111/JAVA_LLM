package request

type BaseCreateRequest struct {
	BaseName string `json:"base_name"`
	BaseDesc string `json:"base_desc,omitempty"`
}

type BaseUpdateRequest struct {
	BaseName string `json:"base_name"`
	BaseDesc string `json:"base_desc,omitempty"`
}

type BaseSearchRequest struct {
	BaseName string `json:"base_name"`
}

type DocDeleteRequest struct {
	BaseID int64 `json:"baseId,string"`
	DocID  int64 `json:"docId,string"`
}

type DocUpdateEnable struct {
	DocID     int64 `json:"docId,string"`
	IsEnabled bool  `json:"is_enabled"`
}

type DocUpdateName struct {
	DocID   int64  `json:"docId,string"`
	DocName string `json:"doc_name"`
}

type DocSearchRequest struct {
	DocName string `json:"doc_name"`
	}
type FileParseRequest struct {
	DocID    int64  `json:"document_id,string"`
	FilePath string `json:"process_document"`
}

type FileParseResult struct {
	Type     string `json:"type"`
	Message  string `json:"message"`
	DocID    int64  `json:"document_id,string,omitempty"`
	FilePath string `json:"file_path,omitempty"`
	Pages    int    `json:"pages,omitempty"`
	Chunks   int    `json:"chunks,omitempty"`
}
