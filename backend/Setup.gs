/** Run once from the Apps Script editor after setting SPREADSHEET_ID. */
function setupSpreadsheet(){var ss=spreadsheet_();Object.keys(SCHEMA).forEach(function(name){var s=ss.getSheetByName(name)||ss.insertSheet(name);var headers=SCHEMA[name];if(s.getMaxColumns()<headers.length)s.insertColumnsAfter(s.getMaxColumns(),headers.length-s.getMaxColumns());s.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#171d2b').setFontColor('#ffffff');s.setFrozenRows(1)});return 'Schema ready';}
/** Run manually. Copy the returned hash into Staff_List; never log or store the password. */
function generatePasswordHashForSetup(password){return createPasswordHash(password)}
