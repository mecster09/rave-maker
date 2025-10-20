# Medidata RAVE RWS API Compatibility Analysis

## Current State ❌

Your current implementation is **NOT compatible** with Medidata.RWS.NET.Standard client library.

### What You Have Now:
- ✅ JSON REST API with Fastify
- ✅ Basic study simulation (subjects, forms, sites)
- ✅ Simple endpoints like `/api/studies/:id/subjects`
- ✅ In-memory storage
- ❌ No ODM XML format support
- ❌ Wrong URL structure (should be `/RaveWebServices/*`)
- ❌ No authentication layer
- ❌ Wrong study naming (should be `ProjectName(Environment)`)
- ❌ No metadata versioning (MetaDataVersionOID)
- ❌ No StudyEvents/ItemGroups/ItemData structure

---

## What Medidata RWS API Requires

### 1. **Base URL Structure**
```
https://{subdomain}.mdsol.com/RaveWebServices/
```

Your current: `/api/studies/:id/subjects`  
RWS expects: `/RaveWebServices/studies/{ProjectName}({Environment})/subjects`

### 2. **Study Naming Convention**
- Format: `{ProjectName}({Environment})`
- Examples: `Mediflex(Prod)`, `Mediflex(Dev)`, `MyStudy(Test)`

Your current: Simple IDs like `TEST-STUDY-001`

### 3. **ODM XML Response Format**
All clinical data must be returned in CDISC ODM XML format, not JSON.

Example expected response structure:
```xml
<?xml version="1.0" encoding="utf-8"?>
<ODM FileType="Snapshot" 
     FileOID="92747321-c8b3-4a07-a874-0ecb53153f20" 
     CreationDateTime="2017-06-05T13:09:33.202-00:00" 
     ODMVersion="1.3" 
     xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata" 
     xmlns="http://www.cdisc.org/ns/odm/v1.3">
  <ClinicalData StudyOID="Mediflex(Prod)" MetaDataVersionOID="1">
    <SubjectData SubjectKey="SUBJECT001">
      <SiteRef LocationOID="SITE-1" />
      <StudyEventData StudyEventOID="SCREENING" StudyEventRepeatKey="1">
        <FormData FormOID="VITALS" FormRepeatKey="1">
          <ItemGroupData ItemGroupOID="VITALS_LOG_LINE">
            <ItemData ItemOID="VITALS.BP_SYSTOLIC" Value="120" />
            <ItemData ItemOID="VITALS.BP_DIASTOLIC" Value="80" />
          </ItemGroupData>
        </FormData>
      </StudyEventData>
    </SubjectData>
  </ClinicalData>
</ODM>
```

### 4. **Required Endpoints**

| Endpoint | Purpose | Current Status |
|----------|---------|----------------|
| `GET /RaveWebServices/version` | Get RWS version | ❌ Missing |
| `GET /RaveWebServices/twohundred` | Health check | ❌ Missing |
| `GET /RaveWebServices/studies` | List all studies | ❌ Missing |
| `GET /RaveWebServices/studies/{project}({env})/subjects` | List subjects | ⚠️ Different format |
| `GET /RaveWebServices/studies/{project}({env})/datasets/regular` | Get clinical data (ODM) | ❌ Missing |
| `GET /RaveWebServices/studies/{project}({env})/subjects/{key}/datasets/regular` | Get subject data (ODM) | ❌ Missing |
| `POST /RaveWebServices/studies/{project}({env})/subjects` | Register subject | ❌ Missing |

### 5. **Authentication**
RWS requires username/password authentication (Basic Auth or MAuth).

Your current: No authentication

### 6. **Clinical Data Structure**

**RWS Hierarchy:**
```
Study
  └─ MetaDataVersion
      └─ Subject
          └─ Site Reference
          └─ StudyEvent (Visit)
              └─ Form
                  └─ ItemGroup
                      └─ Item (Field)
```

**Your current structure:** Flat JSON objects

---

## Recommendations

### Option 1: Full RWS API Compatibility (High Effort)

**Implement a complete mock RWS server with:**

1. **Add ODM XML generation library**
   - Install `xml2js` or `fast-xml-parser`
   - Create ODM XML builders for clinical data

2. **Restructure URLs to match RWS**
   - Change base path to `/RaveWebServices/`
   - Support `ProjectName(Environment)` format
   - Implement all required endpoints

3. **Add Authentication**
   - Basic Auth middleware
   - Mock user credentials

4. **Implement ODM data structure**
   - MetadataVersion
   - StudyEvents (Visits)
   - FormData with ItemGroups and Items
   - Proper OIDs for all elements

5. **Update data model**
   - Change from simple JSON to ODM-compliant structure
   - Add metadata versioning
   - Add study events hierarchy

**Estimated Effort:** 2-3 weeks

### Option 2: Hybrid Approach (Medium Effort)

**Keep your current API for testing, add RWS-compatible endpoints:**

1. **Add `/RaveWebServices/*` routes** alongside existing `/api/*` routes
2. **Create ODM transformer layer** to convert your JSON data to ODM XML
3. **Add basic RWS endpoints** most commonly used:
   - `/RaveWebServices/version`
   - `/RaveWebServices/studies`
   - `/RaveWebServices/studies/{project}({env})/subjects`
   - `/RaveWebServices/studies/{project}({env})/datasets/regular`

4. **Keep your current JSON API** for easier testing and development

**Estimated Effort:** 1 week

### Option 3: Document Limitations (Low Effort)

**Be transparent that this is a simplified mock, not full RWS compatibility:**

1. Update README to clarify this is a **simplified study simulator**
2. Note that it's **not compatible** with Medidata.RWS.NET.Standard
3. Provide clear API documentation for your actual endpoints
4. Suggest use cases: learning, testing custom integrations, demos

**Estimated Effort:** 1 hour

---

## My Recommendation: Option 2 (Hybrid)

This gives you the best of both worlds:
- ✅ Keep your simple JSON API for development/testing
- ✅ Add RWS compatibility for Medidata.RWS.NET.Standard client
- ✅ Moderate implementation effort
- ✅ More realistic EDC simulation

### Implementation Checklist:

- [ ] Install XML generation library
- [ ] Create ODM XML builders
- [ ] Add `/RaveWebServices/` route namespace
- [ ] Implement study name parser `ProjectName(Environment)`
- [ ] Add basic auth middleware
- [ ] Create data transformer (JSON → ODM XML)
- [ ] Implement core RWS endpoints
- [ ] Add RWS-specific tests
- [ ] Update documentation

---

## Next Steps

Would you like me to:

1. **Implement Option 2** - Add RWS-compatible endpoints alongside your current API?
2. **Implement Option 3** - Just update documentation to clarify limitations?
3. **Provide code examples** - Show you how to implement specific RWS endpoints?
4. **Create a separate RWS mock** - Keep your current simulator separate and create a new RWS-focused project?

Let me know which direction you'd prefer!
