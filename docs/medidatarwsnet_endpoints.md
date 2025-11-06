
# Medidata Rave Web Services (RWS) — Detailed Endpoint Reference (from .NET Library and API Specification)

**Base URL Pattern:**  
`/RaveWebServices`  
All paths listed below are appended to the base. Authentication is required for most endpoints except basic health endpoints.

---

## 🧭 1.1.2 RWS Authentication Methods

**Supported Authentication:**  
- Basic Authentication (`Authorization: Basic {base64(username:password)}`)  
- MAuth Authentication (Application-level)

**Example Headers:**
```
Authorization: Basic dXNlcjpwYXNz
```
or
```
Authorization: MAuth realm="Medidata", mauth_signature="...", mauth_time="..."
```

**Response Codes:**
| Code | Meaning | Notes |
|------|----------|--------|
| 200 | OK | Authenticated successfully |
| 401 | Unauthorized | Invalid credentials |
| 403 | Forbidden | Insufficient permissions |

---

## ⚙️ 4. Basic Requests

### 4.1 VersionRequest
**Method:** GET `/version`  
**Description:** Retrieve RWS version string.  
**Auth:** None

**Response:**
- 200 OK  
- Body (`application/xml`):
```xml
<Response>
  <Version>Rave Web Services Version 1.0.0</Version>
</Response>
```

---

### 4.2 BuildVersionRequest
**Method:** GET `/version/build`  
**Description:** Retrieve build version.  
**Auth:** None

**Response:**
- 200 OK  
- Body (`application/xml`):
```xml
<Response>
  <BuildVersion>Build 2025.11.01</BuildVersion>
</Response>
```

---

### 4.3 TwoHundredRequest
**Method:** GET `/twohundred`  
**Description:** Returns XML health response (used for configuration testing).  
**Auth:** None

**Response:**  
- 200 OK  
- Body (`application/xml`):
```xml
<Response>
  <Status>200</Status>
  <Message>TwoHundred OK</Message>
</Response>
```

---

### 4.4 CacheFlushRequest
**Method:** GET `/webservice.aspx?CacheFlush`  
**Description:** Flushes server-side cache.  
**Auth:** Required (Basic or MAuth)

**Response:**
- 200 OK - `<Success/>` XML

---

## 📊 5. Core Resources

### 5.1.1 Retrieve Clinical Studies
**Endpoint:** `GET /studies`  
**Description:** Retrieve list of studies visible to the user.  
**Auth:** Required

**Parameters:** None  
**Response Code:** 200 OK

**Response Example (XML):**
```xml
<ODM>
  <Studies>
    <Study OID="Mediflex" Environment="Prod" />
    <Study OID="Mediflex_UAT" Environment="UAT" />
  </Studies>
</ODM>
```

---

### 5.1.2 Retrieve the List of Subjects in a Study (1.5.9)
**Endpoint:** `GET /studies/{StudyOID}/Subjects`  
**Description:** Retrieves all subjects in a study.  
**Auth:** Required

**Query Parameters:**
| Parameter | Description | Required | Example |
|------------|--------------|-----------|----------|
| `status` | Include status of all subjects | Optional | `status=all` |
| `include` | Include inactive or deleted subjects | Optional | `include=inactiveAndDeleted` |
| `subjectKeyType` | Type of subject key returned | Optional | `subjectKeyType=SubjectName` |
| `links` | Include HATEOAS links | Optional | `links=true` |

**Response Codes:**
| Code | Meaning |
|------|----------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |

**Response Example (XML):**
```xml
<ODM>
  <ClinicalData StudyOID="Mediflex">
    <SubjectData SubjectKey="SUBJ001">
      <StudyEventData StudyEventOID="SCREENING" />
    </SubjectData>
    <SubjectData SubjectKey="SUBJ002" />
  </ClinicalData>
</ODM>
```

---

### 5.2 Retrieve Clinical Datasets Metadata as ODM (1.5.1.1)
**Endpoint:** `GET /studies/{study-oid}/datasets/metadata/regular`  
**Description:** Retrieve study metadata in ODM format.  
**Auth:** Required

**Parameters:**
| Parameter | Description | Required |
|------------|--------------|-----------|
| `{study-oid}` | Study identifier | ✅ |

**Response Codes:**
| Code | Meaning |
|------|----------|
| 200 | OK |
| 404 | Study not found |

**Response Example (XML):**
```xml
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3">
  <Study OID="{study-oid}">
    <GlobalVariables>
      <StudyName>{study-oid}</StudyName>
      <ProtocolName>{study-oid}</ProtocolName>
    </GlobalVariables>
  </Study>
  <MetaDataVersion OID="MDV.1" Name="MetaDataVersion1" />
</ODM>
```

---

### 5.3 Retrieve Clinical Data with Clinical Audit Records Dataset (1.5.3.4)
**Endpoint:** `GET /datasets/ClinicalAuditRecords.odm`  
**Description:** Retrieves audit trail entries for a given study.  
**Auth:** Required

**Query Parameters:**
| Parameter | Description | Required |
|------------|--------------|-----------|
| `studyoid` | Study identifier | ✅ |
| `start` | Start datetime (ISO 8601) | Optional |

**Response Codes:**
| Code | Meaning |
|------|----------|
| 200 | OK |
| 400 | Invalid request |
| 401 | Unauthorized |

**Response Example (XML):**
```xml
<ODM>
  <ClinicalData StudyOID="Mediflex">
    <AuditRecords>
      <AuditRecord UserOID="jsmith" DateTimeStamp="2025-02-15T00:00:00Z" ReasonForChange="Correction">
        <SourceSystem>RaveEDC</SourceSystem>
      </AuditRecord>
    </AuditRecords>
  </ClinicalData>
</ODM>
```

---

### 5.4 Post ODM Clinical Data
**Endpoint:** `POST /webservice.aspx?PostODMClinicalData`  
**Description:** Submit ODM payload to create or update clinical data.  
**Auth:** Required

**Request Body:** ODM XML  
**Response Codes:**
| Code | Meaning |
|------|----------|
| 200 | Success |
| 400 | Invalid ODM format |
| 401 | Unauthorized |
| 403 | Forbidden |

**Response Example:**
```xml
<ODM>
  <Success/>
</ODM>
```

---

## ⚠️ 1.7.8 Error Responses

**Common Error Codes:**
| HTTP Code | Meaning | Example Cause |
|------------|----------|----------------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Invalid parameter or missing StudyOID |
| 401 | Unauthorized | Invalid credentials |
| 403 | Forbidden | Insufficient study permission |
| 404 | Not Found | Study or dataset not found |
| 500 | Internal Server Error | Unexpected condition |

**Error XML Structure:**
```xml
<ErrorResponse>
  <ErrorCode>403</ErrorCode>
  <ErrorDescription>Forbidden</ErrorDescription>
  <Details>User does not have permission for this study.</Details>
</ErrorResponse>
```

---

*Source references: Rave Web Services API Reference Specification (rave_web_services.pdf)*


