// Reads the code the local Gauzy API just sent to EMAIL, from the test helper described in the README.
// Maestro runs this on the computer that runs Maestro; the app never calls the helper.
var answer = http.get(HELPER + '/code?email=' + encodeURIComponent(EMAIL));
output.code = String(answer.body || '').trim();
