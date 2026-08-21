(function () {
  var KEY = 'trail-journal-drafts-v1';
  var BUST = 'tj-sw-bust-v7';

  function bustStaleApp() {
    try {
      if (localStorage.getItem(BUST) === '1') return;
      localStorage.setItem(BUST, '1');
    } catch (err) {
      return;
    }
    var jobs = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
        })
      );
    }
    if (window.caches && caches.keys) {
      jobs.push(
        caches.keys().then(function (keys) {
          return Promise.all(
            keys
              .filter(function (key) {
                return (
                  key.indexOf('trail-journal-app-') === 0 ||
                  key.indexOf('trail-journal-static-') === 0 ||
                  key.indexOf('trail-journal-runtime-') === 0
                );
              })
              .map(function (key) { return caches.delete(key); })
          );
        })
      );
    }
    if (jobs.length === 0) return;
    Promise.all(jobs).then(function () {
      location.reload();
    });
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : 'draft-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function field(id) {
    var el = document.getElementById(id);
    return el && typeof el.value === 'string' ? el.value : '';
  }

  function bodyText() {
    var excerpt = document.getElementById('excerpt');
    var areas = document.querySelectorAll('textarea');
    for (var i = 0; i < areas.length; i++) {
      if (areas[i] !== excerpt) return areas[i].value || '';
    }
    return '';
  }

  function readDrafts() {
    try {
      var parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function showSaved() {
    if (document.getElementById('tj-draft-saved')) return;
    var box = document.createElement('div');
    box.id = 'tj-draft-saved';
    box.setAttribute('role', 'status');
    box.style.cssText =
      'position:fixed;inset:0;background:#fff;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;';
    box.innerHTML =
      '<div><h1 style="font-size:1.5rem;margin:0 0 12px;color:#1c1917">Draft saved on this device</h1><p style="color:#57534e;margin:0 0 20px">Tap View drafts on New Post to open it later. Publish when you have service.</p><button type="button" data-view-drafts="1" style="background:#059669;color:#fff;border:0;border-radius:8px;padding:10px 20px;font-size:14px;margin-right:8px">View drafts</button><button type="button" data-keep-writing="1" style="background:#fff;color:#1c1917;border:1px solid #d6d3d1;border-radius:8px;padding:10px 20px;font-size:14px">Keep writing</button></div>';
    var viewBtn = box.querySelector('[data-view-drafts]');
    var keepBtn = box.querySelector('[data-keep-writing]');
    if (viewBtn) {
      viewBtn.onclick = function () {
        location.href = '/admin/new?view=drafts';
      };
    }
    if (keepBtn) {
      keepBtn.onclick = function () {
        box.remove();
      };
    }
    document.body.appendChild(box);
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(blob);
    });
  }

  function collectPhotos() {
    var jobs = [];
    var fileInput = document.querySelector('input[type="file"][accept*="image"]');
    var files = fileInput && fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];
    files.forEach(function (file) {
      jobs.push(
        blobToDataUrl(file).then(function (dataUrl) {
          return { id: uid(), filename: file.name || 'photo.jpg', dataUrl: dataUrl };
        })
      );
    });
    var imgs = document.querySelectorAll('img[src^="blob:"]');
    imgs.forEach(function (img) {
      jobs.push(
        fetch(img.src)
          .then(function (res) { return res.blob(); })
          .then(function (blob) { return blobToDataUrl(blob); })
          .then(function (dataUrl) {
            return { id: uid(), filename: img.getAttribute('alt') || 'photo.jpg', dataUrl: dataUrl };
          })
          .catch(function () { return null; })
      );
    });
    return Promise.all(jobs).then(function (photos) {
      return photos.filter(Boolean);
    });
  }

  function persist(photos) {
    var id = uid();
    var record = {
      id: id,
      title: field('title'),
      date: field('date'),
      excerpt: field('excerpt'),
      body: bodyText(),
      trail: field('trail'),
      coverPhotoId: '',
      updatedAt: new Date().toISOString(),
      photoCount: photos.length,
      photos: photos.map(function (photo) {
        photo.draftId = id;
        return photo;
      }),
    };
    var rest = readDrafts();
    try {
      localStorage.setItem(KEY, JSON.stringify([record].concat(rest)));
    } catch (err) {
      record.photos = [];
      record.photoCount = 0;
      localStorage.setItem(KEY, JSON.stringify([record].concat(rest)));
    }
    showSaved();
  }

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var button = target.closest('button');
      if (!button) return;
      var label = (button.textContent || '').replace(/\s+/g, ' ').trim();
      if (label !== 'Save as Draft' && label !== 'Saving…') return;

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      collectPhotos()
        .then(persist)
        .catch(function () {
          persist([]);
        });
    },
    true
  );

  bustStaleApp();
})();
