var width,
    height,
    tree = wordtree()
      .on("prefix", function(d) {
        text.call(textViewer);
        var prefix = state.prefix = d.keyword;
        keyword.property("value", prefix);
        url({prefix: prefix});
        refreshText(d.tree);
      }),
    textViewer = d3.longscroll()
      .render(function(div) {
        var a = div.selectAll("a")
            .data(function(i) { return lines[i] || []; });
        a.enter().append("a")
            .attr("href", function(d) { return "#" + encodeURIComponent(d.token); })
            .on("click", function(d) {
              d3.event.preventDefault();
              url({prefix: d.token});
              change();
            })
            .text(function(d) {
              if (d.whitespace) this.parentNode.insertBefore(document.createTextNode(" "), this);
              return d.token;
            });
        a.classed("highlight", highlight)
      });
/*
d3.select("#paste-go").on("click", function() {
  url(state = {source: ""}, true);
  if (d3.select("#paste-save").property("checked")) {
    d3.text("save").post(d3.select("#paste").property("value"), function(error, filename) {
      if (error) alert("An error occurred when attempting to save your text for sharing!");
      else url({source: state.source = filename});
    });
  }
  processText(d3.select("#paste").property("value"));
}); */

var div = d3.select("#examples").selectAll("div.thumb")
    .data([
    ])
    .each(function(o) {
      var s = [];
      for (var k in o) if (k !== "name") s.push(encodeURIComponent(k) + "=" + encodeURIComponent(o[k]));
      o.url = "./?" + s.join("&");
    });
div.append("a")
    .attr("href", function(d) { return d.url; })
    .each(function() {
      this.appendChild(this.parentNode.firstChild);
    });
div.append("a")
    .attr("href", function(d) { return d.url; })
    .text(function(d) { return d.name; });
d3.select("#examples").append("div").attr("class", "clear");

var re = new RegExp("[" + unicodePunctuationRe + "]|\\d+|[^\\d" + unicodePunctuationRe + "0000-001F007F-009F002000A01680180E2000-200A20282029202F205F3000".replace(/\w{4}/g, "\\u$&") + "]+", "g");

var vis = d3.select("#vis"),
    svg = vis.append("svg"),
    clip = svg.append("defs").append("clipPath").attr("id", "clip").append("rect"),
    treeG = svg.append("g")
      .attr("transform", "translate(0,20)")
      .attr("clip-path", "url(#clip)"),
    heatmap = svg.append("g");

var lines = [],
    text = d3.select("#text").on("scroll", scroll),
    hits = d3.select("#hits"),
    keyword = d3.select("#keyword"),
    source = d3.select("#source"),
    state = {},
    tokens,
    selectedLines = [];

heatmap.append("rect")
    .attr("class", "frame")
    .attr("width", 20);

var page = heatmap.append("rect")
    .datum({y: 0})
    .attr("class", "page")
    .attr("width", 20)
    .call(d3.behavior.drag().origin(Object).on("drag", drag));

d3.select(window)
    .on("keydown.hover", hoverKey)
    .on("keyup.hover", hoverKey)
    .on("resize", resize)
    .on("popstate", change);

change();

resize();

d3.select("#form").on("submit", function() {
  d3.event.preventDefault();
  url({prefix: keyword.property("value")});
  change();
});

d3.select("#form-source").on("submit", function() {
  d3.event.preventDefault();
  url({source: source.property("value"), prefix: ""}, true);
  change();
});

d3.select("#sort").selectAll("option")
    .data(["frequency", "occurrence"])
  .enter().append("option")
    .attr("value", String)
    .text(String);

d3.select("#reverse")
    .property("checked", +state.reverse)
    .on("change", function() {
      url({reverse: this.checked ? 1 : 0});
      change();
    });
d3.select("#phrase-line")
    .property("checked", +state["phrase-line"])
    .on("change", function() {
      url({"phrase-line": this.checked ? 1 : 0});
      change();
    });
d3.select("#sort")
    .on("change", function() {
      url({sort: this.value});
      change();
    });

//var text123 = doublerainbow.txt;
//processText(text123);
//var topPrefix = getTopNWords(text123,1);

// hits.text("Found " + format(count) + " unique instances out of " + format(tokens.length) + " tokens (" + percent(count / tokens.length) + ")");

function resize() {
  width = vis.node().clientWidth;
  height = window.innerHeight - 50 - 0;
  heatmap.attr("transform", "translate(" + (width - 20.5) + ",.5)")
      .select("rect.frame").attr("height", height - 1);
  svg .attr("width", width)
      .attr("height", height);
  clip.attr("width", width - 30.5)
      .attr("height", height);
  treeG.call(tree.width(width - 30).height(height - 20));
  updateHeatmap();
  text.call(textViewer);
}

function processText(t) {
  var i = 0,
      m,
      n = 0,
      line = 0,
      lineLength = 0,
      tmp = text.append("span").text("m"),
      dx = 285 / tmp.node().offsetWidth;
  tmp.remove();
  tokens = [];
  lines = [];
  var line = [];
  while (m = re.exec(t)) {
    var w = t.substring(i, m.index);
    if (/\r\n\r\n|\r\r|\n\n/.test(w)) {
      lines.push(line, []);
      line = [];
      lineLength = m[0].length;
    } else {
      lineLength += m[0].length + !!w.length;
      if (lineLength > dx) lineLength = m[0].length, lines.push(line), line = [];
    }
    var token = {token: m[0], lower: m[0].toLowerCase(), index: n++, whitespace: w, line: lines.length};
    tokens.push(token);
    line.push(token);
    i = re.lastIndex;
  }
  lines.push(line);
  text.call(textViewer.size(lines.length));
  tree.tokens(tokens);
  change();
}

function getURL(url, callback) {
  console.log('calling ',url)

  d3.xhr(url, function(error, req) {
    //console.log(error, req)
    response(error, req);
  });
  
  function response(error, req) {
    //console.log("xhr", error, req)
    callback(error, req);
  }
}

var entity = document.createElement("span");

function decodeEntity(d) {
  entity.innerHTML = d;
  return entity.textContent;
}

function url(o, push) {
  var query = [],
      params = {};
  for (var k in state) params[k] = state[k];
  for (var k in o) params[k] = o[k];
  for (var k in params) {
    query.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
  }
  history[push ? "pushState" : "replaceState"](null, null, "?" + query.join("&"));
}

function urlParams(h) {
  var o = {};
  h && h.split(/&/g).forEach(function(d) {
    d = d.split("=");
    o[decodeURIComponent(d[0])] = decodeURIComponent(d[1]);
  });
  return o;
}

function change() {
  if (!location.search) {
    showHelp();
    return;
  }
  var last = state ? state.source : null;
  state = urlParams(location.search.substr(1));
  var theToppiestWordEver;// = 'notser';
  //console.log(state)
  if (state.source !== last && state.source) {
    source.property("value", state.source);
    getURL(state.source, function(error, text) {
      if(error)
        return null;

      console.log('text', text);
      state.text = text.response;
      theToppiestWordEver = getTopNWords(text.response,1)[0];
      state.prefix = theToppiestWordEver;
      console.log('setting prefix:', state.prefix)
      state.text = 12312;
      processText(text.response);
      change()
    });
    hideHelp();
  } else if (tokens && tokens.length) {

    var start = state.prefix;
    console.log("checking prefix:", start, theToppiestWordEver);
    //start = 'shit'
    //start = 'tttatata'

    if (!start){
      start = theToppiestWordEver;
    }

    if (!start) {
      url({prefix: start = tokens[0].token});
    }
    keyword
        .property("value", start)
        .node().select();
    start = start.toLowerCase().match(re);
    treeG.call(tree.sort(state.sort === "occurrence"
          ? function(a, b) { return a.index - b.index; }
          : function(a, b) { return b.count - a.count || a.index - b.index; })
        .reverse(+state.reverse)
        .phraseLine(+state["phrase-line"])
        .prefix(start));
    refreshText(tree.root());
    hideHelp();
  }
}

function showHelp() {
  d3.selectAll("#help-window, #form-source").style("display", null);
  d3.selectAll("#form, #reverse-wrapper").style("display", null);
}

function hideHelp() {
  d3.selectAll("#help-window, #form-source").style("display", "none");
  d3.selectAll("#form, #reverse-wrapper").style("display", "inline-block");
}

function currentLine(node) {
  if (!node) return 0;
  var children = node.children;
  while (children && children.length) {
    node = children[0];
    children = node.children;
  }
  return node.tokens[0].line - 3; // bit of a hack!
}

function refreshText(node) {
  clearHighlight();
  var parent = node, depth = 0;
  while (parent) {
    depth += parent.tokens.length;
    parent = parent.parent;
  }
  selectedLines = [];
  highlightTokens(node, depth);
  updateHeatmap();
  text.call(textViewer.position(currentLine(node)));
}

function clearHighlight() {
  for (var i = -1; ++i < tokens.length;) tokens[i].highlight = false;
}

function highlightTokens(node, depth) {
  if (!node) return;
  if (node.children && node.children.length) {
    depth += node.tokens.length;
    node.children.forEach(function(child) {
      highlightTokens(child, depth);
    });
  } else {
    node.tokens.forEach(function(token) { token.highlight = true; });
    for (var n = node.tokens[0].index, i = Math.max(0, n - depth); i <= n; i++) {
      tokens[i].highlight = true;
      selectedLines.push(tokens[i].line);
    }
  }
}

function highlight(d) { return d.highlight; }

function updateHeatmap() {
  var line = heatmap.selectAll("line").data(selectedLines),
      n = textViewer.size();
  line.enter().insert("line", "rect").attr("x2", 20);
  line.attr("transform", function(d) { return "translate(0," + height * d / n + ")"; });
  line.exit().remove();
  var d = page.datum();
  d.h = Math.min(height, Math.max(10, height * height / (textViewer.rowHeight() * lines.length)));
  page.attr("height", d.h - 1);
}

function scroll() {
  var d = page.datum();
  page.attr("y", d.y = Math.max(0, Math.min(height - d.h, height * this.scrollTop / (textViewer.rowHeight() * lines.length))));
}

function drag(d) {
  d.y = Math.max(0, Math.min(height - d.h - 1, d3.event.y));
  text.node().scrollTop = d.y * textViewer.rowHeight() * lines.length / height;
  page.attr("y", d.y);
}

function hoverKey() {
  svg.classed("hover", d3.event.shiftKey);
}

function isStopWord(word){
  var stopWords = ["a","able","about","across","after","all","almost","also","am","among","an","and","any","are","as","at","be","because","been","but","by","can","cannot","could","dear","did","do","does","either","else","ever","every","for","from","get","got","had","has","have","he","her","hers","him","his","how","however","i","if","in","into","is","it","its","just","least","let","like","likely","may","me","might","most","must","my","neither","no","nor","not","of","off","often","on","only","or","other","our","own","rather","said","say","says","she","should","since","so","some","than","that","the","their","them","then","there","these","they","this","tis","to","too","twas","us","wants","was","we","were","what","when","where","which","while","who","whom","why","will","with","would","yet","you","your"];
  return (stopWords.indexOf(word) !=- 1);
} 

function getTopNWords(text, n)
{
    var wordRegExp = /\w+(?:'\w{1,2})?/g;
    var words = {};
    var matches;
    var i = 0;
    while ((matches = wordRegExp.exec(text)) != null)
    {
        i++;
        var word = matches[0].toLowerCase();
        stopWord = isStopWord(word);
        if (stopWord) {
          continue;
        }

        if (typeof words[word] == "undefined")
        {
            words[word] = 1;
        }
        else
        {
            words[word]++;
        }
    }

    var wordList = [];
    for (var word in words)
    {
        if (words.hasOwnProperty(word) && !isStopWord(word))
        {
            wordList.push([word, words[word]]);
        } else {
          console.log("Stop word detected: ", word)
        }
    }
    wordList.sort(function(a, b) { return b[1] - a[1]; });

    var topWords = [];
    for (var i = 0; i < n; i++)
    {
        topWords.push(wordList[i][0]);
    }
    return topWords;
}