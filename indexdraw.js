let scale = 1; // 기본 스케일
let offsetX = 0; // X축 오프셋
let offsetY = 0; // Y축 오프셋
let isDragging = false; // 드래그 여부
let startX, startY; // 드래그 시작 위치
let markers = []; // 마커들

var canvas = document.getElementById("myCanvas"),
  ctx = canvas.getContext("2d"),
  canvasWidth = canvas.width,
  canvasHeight = canvas.height,
  bounds = { maxLon: 1, minLon: 200, maxLat: 1, minLat: 200 };

// 각 좌표들을 순회하며 최소 및 최대 경도와 위도를 계산합니다.
data.features.forEach(function (feature) {
  feature.geometry.coordinates.forEach(function (coordsSet) {
    coordsSet.forEach(function (coords) {
      coords.length <= 1
        ? updateBounds(coords)
        : coords.forEach(function (coord) {
            updateBounds(coord);
          });
    });
  });
});

var drawnPolygons = [];

// 각 지리 데이터를 순회하며 캔버스에 폴리곤을 그립니다.
data.features.forEach(function (feature) {
  var polygonData = {
    name: feature.properties.adm_nm,
    properties: feature.properties,
    paths: [],
  };
  feature.geometry.coordinates.forEach(function (coordsSet) {
    var currentPath = [];

    coordsSet.forEach(function (coords) {
      if (coords.length <= 2) {
        var x = lonToX(coords[0]),
          y = latToY(coords[1]);
        currentPath.push({ x: x, y: y });
      } else {
        currentPath = [];
        coords.forEach(function (coord) {
          var x = lonToX(coord[0]),
            y = latToY(coord[1]);
          currentPath.push({ x: x, y: y });
        });
        polygonData.paths.push(currentPath);
      }
    });
    polygonData.paths.push(currentPath);
  });

  drawnPolygons.push(polygonData);
});

var sortedPolygons = [];

// 경도와 위도를 이용해 캔버스의 X 좌표를 계산합니다.
function lonToX(lon) {
  var normalizedLon = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon);
  return canvasWidth * normalizedLon;
}

// 경도와 위도를 이용해 캔버스의 Y 좌표를 계산합니다.
function latToY(lat) {
  var normalizedLat = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
  return canvasHeight - canvasHeight * normalizedLat;
}

// 캔버스의 X 좌표를 이용해 경도를 계산합니다.
function xToLon(x) {
  var normalizedX = x / canvasWidth;
  return normalizedX * (bounds.maxLon - bounds.minLon) + bounds.minLon;
}

// 캔버스의 Y 좌표를 이용해 위도를 계산합니다.
function yToLat(y) {
  var normalizedY = 1 - y / canvasHeight;
  return normalizedY * (bounds.maxLat - bounds.minLat) + bounds.minLat;
}

// 경도와 위도를 바탕으로 최소, 최대 값을 업데이트합니다.
function updateBounds(coords) {
  var lon = coords[0],
    lat = coords[1];
  bounds.minLon = Math.min(lon, bounds.minLon);
  bounds.maxLon = Math.max(lon, bounds.maxLon);
  bounds.minLat = Math.min(lat, bounds.minLat);
  bounds.maxLat = Math.max(lat, bounds.maxLat);
}

// 포인트가 특정 폴리곤 내부에 있는지 확인합니다.
// Ray casting algorithm 사용함
function getPolygon(transformedPoint) {
  var foundPolygon;
  sortedPolygons.forEach(function (polygon) {
    var crossings = 0;
    for (var i = 0; i < polygon.path.length; i++) {
      var currPoint = polygon.path[i],
        nextPoint = polygon.path[(i + 1) % polygon.path.length];
      if (
        currPoint.y > transformedPoint.y !=
        nextPoint.y > transformedPoint.y
      ) {
        var intersectX =
          ((nextPoint.x - currPoint.x) * (transformedPoint.y - currPoint.y)) /
            (nextPoint.y - currPoint.y) +
          currPoint.x;
        if (transformedPoint.x < intersectX) crossings++;
      }
    }
    if (crossings % 2 > 0) foundPolygon = polygon;
  });
  return foundPolygon;
}

// 폴리곤을 y 좌표에 따라 내림차순으로 정렬합니다.
drawnPolygons.forEach(function (polygon) {
  var sortedPolygon = { name: polygon.name, path: [] };
  polygon.paths.forEach(function (path) {
    path.forEach(function (point) {
      sortedPolygon.path.push({ x: point.x, y: point.y });
    });
  });
  sortedPolygon.path.sort(function (a, b) {
    return b.y - a.y;
  });
  sortedPolygons.push(sortedPolygon);
});

// 마우스 움직임에 따라 폴리곤 이름을 출력합니다.
canvas.addEventListener("mousemove", function (event) {
  const point = {
    x: event.clientX - canvas.offsetLeft,
    y: event.clientY - canvas.offsetTop,
  };
  // 스케일과 오프셋을 고려한 마우스 좌표 변환
  const transformedPoint = {
    x: (point.x - offsetX - canvas.width / 2) / scale + canvas.width / 2,
    y: (point.y - offsetY - canvas.height / 2) / scale + canvas.height / 2,
  };
  var polygon = getPolygon(transformedPoint);
  if (polygon) console.log(polygon.name);
});
function preSetupCtx() {
  ctx.translate(offsetX, offsetY);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale); // 줌 기능
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
}
// 그려진 폴리곤들 + 마커를 캔버스에 그립니다.
function drawGangneung() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawnPolygons.forEach(function (polygon) {
    polygon.paths.forEach(function (path) {
      ctx.save();
      preSetupCtx();
      ctx.beginPath();
      var isFirstPoint = true;
      path.forEach(function (point) {
        if (isFirstPoint) {
          ctx.moveTo(point.x, point.y);
          isFirstPoint = false;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.strokeStyle = "black";
      ctx.stroke();
      ctx.fillStyle = getRandomColor();
      ctx.fill();
      ctx.closePath();
      ctx.restore();
    });
  });

  function getRandomColor() {
    var letters = "0123456789ABCDEF";
    var color = "#";
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  markers.forEach((marker) => {
    console.log(marker);
    ctx.save();
    preSetupCtx();
    ctx.beginPath();
    const x = lonToX(marker.lon);
    const y = latToY(marker.lat);
    console.log(scale);
    // zoom in zoom out 기능이 있으므로 항상 사이즈는 scale 만큼
    // 나눠야 한다는 것을 잊지 말자!!!!
    ctx.arc(x, y, 10 / scale, 0, Math.PI * 2); // 원 그리기
    ctx.fillStyle = "blue"; // 원 색상
    ctx.fill(); // 색상 채우기
    ctx.restore();
  });
}

drawGangneung();

function zoomIn() {
  scale *= 1.2; // 스케일을 20% 확대
  drawGangneung();
}

function zoomOut() {
  scale /= 1.2; // 스케일을 20% 축소
  drawGangneung();
}

// 드래그 시작
canvas.addEventListener("mousedown", function (e) {
  isDragging = true;
  startX = e.clientX - offsetX;
  startY = e.clientY - offsetY;
  const point = {
    x: e.clientX - canvas.offsetLeft,
    y: e.clientY - canvas.offsetTop,
  };
  // 스케일과 오프셋을 고려한 마우스 좌표 변환
  const transformedPoint = {
    x: (point.x - offsetX - canvas.width / 2) / scale + canvas.width / 2,
    y: (point.y - offsetY - canvas.height / 2) / scale + canvas.height / 2,
  };
  console.log("lon", xToLon(transformedPoint.x));
  console.log("lat", yToLat(transformedPoint.y));
  canvas.style.cursor = "grabbing"; // 커서 변경
});

// 드래그 중
canvas.addEventListener("mousemove", function (e) {
  if (isDragging) {
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    drawGangneung(); // 캔버스 내용 다시 그리기
  }
});

// 드래그 종료
canvas.addEventListener("mouseup", function () {
  isDragging = false;
  canvas.style.cursor = "grab"; // 커서 변경
});

// 드래그가 캔버스 밖에서 종료되었을 때 처리
canvas.addEventListener("mouseleave", function () {
  isDragging = false;
  canvas.style.cursor = "grab"; // 커서 변경
});

// 휠 이벤트로 줌 인/아웃 제어
canvas.addEventListener("wheel", function (e) {
  e.preventDefault(); // 기본 휠 동작(스크롤) 방지

  // e.deltaY > 0이면 휠이 아래로, e.deltaY < 0이면 휠이 위로 움직임
  if (e.deltaY < 0) {
    zoomIn(); // 줌 인
  } else {
    zoomOut(); // 줌 아웃
  }
});
