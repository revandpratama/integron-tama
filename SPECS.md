# System Integrator Assistant - Application Specifications

## Overview
This application is designed to support the workflow of a Banking System Integrator (BRI). It serves as a central hub for managing partner integrations, tracking technical constraints (proxies, timeouts), monitoring incidents, and generating reports. The main path is to be main dashboard for overview, all these spec below will have their own subpaths.

---

## 1. Partner Profile System
**Goal:** Centralized management of external partner data and environment configurations.

### Data Requirements
* **Core Details:**
    * Partner Name
    * Partner Code (Internal ID)
    * **Status:** `Onboarding` | `Live` | `Blocked` | `Decommissioned`
* **Environment Configs (Per Environment: DEV vs. PROD):**
    * Base URL
    * Whitelisted IPs
    * Credentials Owner (Who holds the keys?)

### Functional Requirements
* Ability to toggle between DEV and PROD views to prevent configuration mix-ups.

---

## 2. The Integration Catalog (SNAP vs. NON-SNAP)
**Goal:** a detailed registry of API features with technical constraints.

### Data Requirements
* **Feature Name** (e.g., "Direct Debit", "Account Inquiry")
* **Category:** `SNAP` | `NON-SNAP`
* **Technical Specs:**
    * Apigee Product Name
    * Apigee Trace Proxy Name
* **"Gotchas" / Notes:** Free text field for specific implementation quirks (e.g., "Requires specific header X").

---

## 3. The "Rolodex" (People & Roles)
**Goal:** Manage contact information for both external partners and internal dependencies.

### Data Requirements
* **Person Details:** Name, Phone Number, Email.
* **Tags/Roles:** (e.g., "Partner Dev", "BRI Security", "PM", "Network Team").

### Relationships
* **Person ↔ Partners:** A single person can be linked to multiple partners (handling vendors/aggregators).
* **Internal Person ↔ Feature:** Ability to link an internal BRI contact (e.g., Database Admin) to a specific Feature for emergency escalation.

---

## 4. Integration Kanban Board
**Goal:** Visual project management for partner onboarding.

### Functional Requirements
* **Board Structure:** Columns for `Admin`, `Dev/Sandbox`, `UAT`, `Production`.
* **Drag-and-Drop:** Move Partner cards between columns.
* **Stale Alert:** Visual indicator (e.g., color change or icon) if a partner has remained in the same column for > X days.

---

## 5. Smart Reminder System
**Goal:** Ensure consistent communication and follow-up.

### Logic & Automation
* **Last Contact Tracking:** Store the date of the last interaction for every partner.
* **Auto-Reminder:** If "Last Contact Date" > 7 days ago, trigger a notification/flag.
* **Custom Reminders:** Ability to set manual follow-ups (e.g., "Remind me next Tuesday for UAT sign-off").

---

## 6. Incident & Issue Tracker
**Goal:** Log and track technical blockers during integration.

### Data Requirements
* **Issue Description:** "Feature X is failing for Partner Y".
* **Severity:** `Critical` (Blocker) | `Major` | `Minor`.
* **Status:** `Open` | `Waiting on Partner` | `Resolved`.
* **Context:** Direct link to the **Feature** involved (auto-displaying timeout/proxy details).

---

## 7. Technical Helper Tools
**Goal:** Reduce friction for repetitive technical tasks.

### Tools
1.  **SNAP Signature Generator:**
    * Input: JSON Body + Client Secret.
    * Output: Valid `X-SIGNATURE` or `Authorization` string.
2.  **cURL Builder:**
    * One-click button on Feature pages to copy a valid cURL request command to clipboard.
3.  **Response Code Lookup:**
    * Searchable dictionary for internal error codes (e.g., "400-99") mapping to descriptions.

---

## 8. The Knowledge Base (Wiki)
**Goal:** Capture "Tribal Knowledge" and undocumented behaviors.

### Functional Requirements
* **Search:** Global search across all notes.
* **Content:** Free text entries for specific learnings (e.g., "Partner A returns 200 OK on failure").
* **Tagging:** Hashtag support for quick filtering (e.g., `#timeout`, `#firewall`, `#cert`, `#briva`).

---

## 9. AI Weekly Reporter
**Goal:** Automate administrative reporting.

### Functional Requirements
* **Data Aggregation:** Pull data from:
    * Partners contacted this week.
    * Issues resolved / closed.
    * Partners currently stuck (Stale status).
* **Output:** Generate a formatted text summary suitable for copy-pasting into email/chat for management updates.



Add filter by on management partner
add pagination
