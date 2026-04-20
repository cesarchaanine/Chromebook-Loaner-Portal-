security_spec:
  data_invariants:
    - "A student must belong to a location."
    - "A loan must be associated with a tech and a location."
    - "A user can only be created by an admin or if it's their own profile (initial setup)."

  dirty_dozen_payloads:
    - description: "Unauthenticated user trying to read user profiles"
      path: "/users/victimId"
      operation: "get"
      auth: null
      expected: "PERMISSION_DENIED"
    - description: "Tech trying to update another user's role"
      path: "/users/victimId"
      operation: "update"
      data: { "role": "admin" }
      auth: { "uid": "techId", "token": { "email_verified": true } }
      expected: "PERMISSION_DENIED"
    - description: "Unauthenticated user trying to list all loans"
      path: "/loans"
      operation: "list"
      auth: null
      expected: "PERMISSION_DENIED"
    - description: "Tech trying to delete a loan record"
      path: "/loans/loanId"
      operation: "delete"
      auth: { "uid": "techId", "token": { "email_verified": true } }
      expected: "PERMISSION_DENIED"
    - description: "User trying to create a student in a location they don't belong to"
      path: "/students/newDoc"
      operation: "create"
      data: { "id": "S123", "name": "Evil Student", "location": "K8KAT" }
      auth: { "uid": "techId", "token": { "email_verified": true } }
      # This depends on if we enforce location-specific writes. We will enforce that techs can only write for their location.
      expected: "PERMISSION_DENIED"
