// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE
/**
 * @modifier NHN FE Development Lab <dl_javascript@nhn.com>
 */
import CodeMirror from 'codemirror';

/*eslint-disable */
var listRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/,
  emptyListRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/,
  unorderedListRE = /[*+-]\s/;

CodeMirror.commands.indentOrderedList = function(cm) {
  if (cm.getOption('disableInput')) return CodeMirror.Pass;
  var ranges = cm.listSelections();
  for (var i = 0; i < ranges.length; i++) {
    var pos = ranges[i].head;
    var line = cm.getLine(pos.line);
    var cursorBeforeTextInline = line.substr(0, pos.ch);

    if (listRE.test(cursorBeforeTextInline) || cm.somethingSelected()) {
      cm.indentSelection('add');
    } else {
      cm.execCommand('insertSoftTab');
    }
  }
  cm.execCommand('fixOrderedListNumber');
};

CodeMirror.commands.newlineAndIndentContinueMarkdownList = function(cm) {
  if (cm.getOption('disableInput')) return CodeMirror.Pass;
  var ranges = cm.listSelections(),
    replacements = [];
  for (var i = 0; i < ranges.length; i++) {
    var pos = ranges[i].head;
    var line = cm.getLine(pos.line),
      match = listRE.exec(line);
    var cursorBeforeBullet = /^\s*$/.test(line.slice(0, pos.ch));
    if (!ranges[i].empty() || !match || cursorBeforeBullet) {
      cm.execCommand('newlineAndIndent');
      return;
    }
    if (emptyListRE.test(line)) {
      if (!/>\s*$/.test(line))
        cm.replaceRange(
          '',
          {
            line: pos.line,
            ch: 0
          },
          {
            line: pos.line,
            ch: pos.ch + 1
          }
        );
      replacements[i] = '\n';
    } else {
      var indent = match[1],
        after = match[5];
      var numbered = !(unorderedListRE.test(match[2]) || match[2].indexOf('>') >= 0);
      var bullet = numbered ? parseInt(match[3], 10) + 1 + match[4] : match[2].replace('x', ' ');
      replacements[i] = '\n' + indent + bullet + after;

      if (numbered) incrementRemainingMarkdownListNumbers(cm, pos);
    }
  }

  cm.replaceSelections(replacements);
};

// Auto-updating Markdown list numbers when a new item is added to the
// middle of a list
function incrementRemainingMarkdownListNumbers(cm, pos) {
  var startLine = pos.line,
    lookAhead = 0,
    skipCount = 0;
  var startItem = listRE.exec(cm.getLine(startLine)),
    startIndent = startItem[1];

  do {
    lookAhead += 1;
    var nextLineNumber = startLine + lookAhead;
    var nextLine = cm.getLine(nextLineNumber),
      nextItem = listRE.exec(nextLine);

    if (nextItem) {
      var nextIndent = nextItem[1];
      var newNumber = parseInt(startItem[3], 10) + lookAhead - skipCount;
      var nextNumber = parseInt(nextItem[3], 10),
        itemNumber = nextNumber;

      if (startIndent === nextIndent && !isNaN(nextNumber)) {
        if (newNumber === nextNumber) itemNumber = nextNumber + 1;
        if (newNumber > nextNumber) itemNumber = newNumber + 1;
        cm.replaceRange(
          nextLine.replace(listRE, nextIndent + itemNumber + nextItem[4] + nextItem[5]),
          {
            line: nextLineNumber,
            ch: 0
          },
          {
            line: nextLineNumber,
            ch: nextLine.length
          }
        );
      } else {
        if (startIndent.length > nextIndent.length) return;
        // This doesn't run if the next line immediatley indents, as it is
        // not clear of the users intention (new indented item or same level)
        if (startIndent.length < nextIndent.length && lookAhead === 1) return;
        skipCount += 1;
      }
    }
  } while (nextItem);
}
