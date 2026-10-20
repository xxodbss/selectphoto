// epilego 별점 적용 — 어도비 브릿지 시작 스크립트
//
// 설치: 브릿지 [환경 설정 → 시작 스크립트 → 내 시작 스크립트 표시]로 열린 폴더에
//       이 파일을 넣고 브릿지를 다시 켠다. 처음 켤 때 스크립트를 허용한다.
// 사용: 사진 폴더를 열고 [도구 → epilego 별점 적용…] → 작가 화면에서 내려받은 결과 파일을 고른다.
//
// 결과 파일 형식: "별점<탭>파일명" 한 줄씩, #으로 시작하는 줄은 설명.
// 확장자를 빼고 이름이 같은 사진에 모두 적용한다 (DSC_0012.jpg → DSC_0012.JPG, DSC_0012.ARW).
// 0점(모델이 안 고름)이면 별점을 지운다.
// 브릿지 스크립트는 오래된 자바스크립트(ES3)라 let, 화살표 함수, forEach를 쓰지 않는다.

#target bridge

if (BridgeTalk.appName === "bridge") {
  var epilegoMenu = new MenuElement(
    "command",
    "epilego 별점 적용…",
    "at the end of Tools",
    "epilegoApplyRatings"
  );
  epilegoMenu.onSelect = function () {
    try {
      epilegoApplyRatings();
    } catch (e) {
      alert("epilego: 적용하다가 문제가 생겼어요.\n" + e);
    }
  };
}

// "DSC_0012.jpg" → "dsc_0012"
function epilegoBaseName(name) {
  var dot = name.lastIndexOf(".");
  var base = dot > 0 ? name.substring(0, dot) : name;
  return base.toLowerCase();
}

function epilegoReadResults(file) {
  file.encoding = "UTF-8";
  if (!file.open("r")) return null;
  var text = file.read();
  file.close();

  var ratings = {};
  var count = 0;
  var lines = text.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/^﻿/, "");
    if (line === "" || line.charAt(0) === "#") continue;
    var tab = line.indexOf("\t");
    if (tab < 0) continue;
    var rating = parseInt(line.substring(0, tab), 10);
    var name = line.substring(tab + 1);
    if (isNaN(rating) || rating < 0 || rating > 5 || name === "") continue;

    var key = epilegoBaseName(name);
    // 카메라 두 대가 같은 파일명을 쓰면 높은 점수를 남긴다
    if (ratings.hasOwnProperty(key)) {
      ratings[key].duplicate = true;
      if (rating > ratings[key].rating) ratings[key].rating = rating;
    } else {
      ratings[key] = { rating: rating, name: name, used: false, duplicate: false };
      count++;
    }
  }
  return { ratings: ratings, count: count };
}

function epilegoSetRating(thumb, rating) {
  try {
    thumb.rating = rating;
  } catch (e) {
    // 예전 브릿지: 메타데이터로 직접 쓴다
    var md = thumb.synchronousMetadata;
    md.namespace = "http://ns.adobe.com/xap/1.0/";
    md.Rating = rating;
  }
}

function epilegoApplyRatings() {
  var doc = app.document;
  if (!doc || !doc.thumbnail) {
    alert("epilego: 먼저 사진이 있는 폴더를 열어 주세요.");
    return;
  }

  var file = File.openDialog("epilego 결과 파일을 골라 주세요", "*.txt");
  if (!file) return;

  var results = epilegoReadResults(file);
  if (!results || results.count === 0) {
    alert("epilego: 결과 파일에서 별점을 찾지 못했어요. 작가 화면에서 내려받은 파일이 맞는지 확인해 주세요.");
    return;
  }

  var children = doc.thumbnail.children;
  var applied = 0;
  for (var i = 0; i < children.length; i++) {
    var thumb = children[i];
    if (thumb.container) continue; // 하위 폴더는 건너뜀
    var entry = results.ratings[epilegoBaseName(thumb.name)];
    if (!entry) continue;
    epilegoSetRating(thumb, entry.rating);
    entry.used = true;
    applied++;
  }

  var missing = [];
  var duplicates = [];
  for (var key in results.ratings) {
    if (!results.ratings.hasOwnProperty(key)) continue;
    if (!results.ratings[key].used) missing.push(results.ratings[key].name);
    if (results.ratings[key].duplicate) duplicates.push(results.ratings[key].name);
  }

  var message = "epilego: 사진 " + applied + "개에 별점을 넣었어요.";
  if (missing.length > 0) {
    message += "\n\n이 폴더에서 못 찾은 사진 " + missing.length + "장:\n" + missing.slice(0, 15).join("\n");
    if (missing.length > 15) message += "\n…";
  }
  if (duplicates.length > 0) {
    message += "\n\n이름이 겹쳐서 높은 점수로 넣은 사진:\n" + duplicates.slice(0, 15).join("\n");
  }
  alert(message);
}
