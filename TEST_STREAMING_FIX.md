# Test Streaming Source Fix

Run these tests in your browser console (F12) after the fix is deployed.

## Quick Test - Copy & Paste into Browser Console

```javascript
// Import the function
import { findStreamingSource } from './frontend/src/services/animeApi.js';

// Test Case 1: Popular anime (should find immediately)
console.log("Test 1: Attack on Titan");
findStreamingSource("Attack on Titan").then(result => {
  console.log(result ? `✅ PASS - Found on ${result.source}` : "❌ FAIL");
});

// Test Case 2: Less popular anime
console.log("\nTest 2: Steinsgate");
findStreamingSource("Steinsgate").then(result => {
  console.log(result ? `✅ PASS - Found on ${result.source}` : "❌ FAIL");
});

// Test Case 3: Anime with special characters
console.log("\nTest 3: Re:Zero");
findStreamingSource("Re:Zero").then(result => {
  console.log(result ? `✅ PASS - Found on ${result.source}` : "❌ FAIL");
});

// Test Case 4: Season-specific (should strip season info)
console.log("\nTest 4: Demon Slayer Season 2");
findStreamingSource("Demon Slayer Season 2").then(result => {
  console.log(result ? `✅ PASS - Found on ${result.source}` : "❌ FAIL");
});

// Test Case 5: Very new anime (might fail)
console.log("\nTest 5: Brand New Anime 2026");
findStreamingSource("Brand New Anime 2026").then(result => {
  console.log(result ? `✅ PASS - Found on ${result.source}` : "ℹ️ INFO - Not on streaming sites (expected)");
});

// View cache after tests
console.log("\nCache contents:");
console.table(Array.from(streamingCache.entries()));
```

---

## Manual Testing via UI

### Test 1: Popular Anime
1. Click on **"Attack on Titan"**
2. Click **"Watch Now"** button
3. **Expected**: Should find streaming source within 2-4 seconds
4. **Result**: ✅ Pass / ❌ Fail

### Test 2: Different Popular Anime
1. Click on **"Demon Slayer"**
2. Click **"Watch Now"** button
3. **Expected**: Should find on one of the streaming sites
4. **Result**: ✅ Pass / ❌ Fail

### Test 3: Old Anime
1. Click on **"Cowboy Bebop"** (if available)
2. Click **"Watch Now"** button
3. **Expected**: Should find despite being older
4. **Result**: ✅ Pass / ❌ Fail

### Test 4: Error Message Quality
1. Search for an obscure or very new anime
2. Click **"Watch Now"** button
3. **Expected**: Helpful error message, not generic error
4. **Result**: ✅ Pass / ❌ Fail

---

## Performance Testing

### Test Search Speed

```javascript
// Measure search time
const testTitle = "Attack on Titan";
const start = performance.now();

findStreamingSource(testTitle).then(result => {
  const duration = (performance.now() - start) / 1000;
  console.log(`Search took ${duration.toFixed(2)} seconds`);
  console.log(`Expected: 2-4 seconds (first search), <100ms (cached)`);
  console.log(`Result: ${duration < 4 ? '✅ PASS' : '❌ FAIL'}`);
});
```

**Expected Results**:
- First search: 2-4 seconds (network requests)
- Subsequent searches (same anime): <100ms (from cache)

### Test Cache Efficiency

```javascript
// Test cache hit
const testTitle = "Test Anime";

// First call - cache miss
console.time("First search");
await findStreamingSource(testTitle);
console.timeEnd("First search");
// Expected: ~2-4 seconds

// Second call - cache hit
console.time("Second search (cached)");
await findStreamingSource(testTitle);
console.timeEnd("Second search (cached)");
// Expected: <100ms
```

---

## Debugging Commands

If something isn't working:

```javascript
// 1. View all cached sources
console.log("Cached sources:");
streamingCache.forEach((value, key) => {
  console.log(`${key}: ${value.data.source}`);
});

// 2. Clear cache to force fresh search
streamingCache.clear();
console.log("Cache cleared");

// 3. Check title variants
titleVariants("Re:Zero Season 2 (2022)").forEach(v => console.log(v));

// 4. Enable detailed logging
localStorage.debug = '*';

// 5. Test a specific provider directly
import { searchAnitaku, searchZoro } from './animeApi.js';
await searchAnitaku("Attack on Titan");
await searchZoro("Attack on Titan");
```

---

## Automated Test Suite (Optional)

Save as `test-streaming.js` in your project:

```javascript
import { findStreamingSource } from './services/animeApi.js';

const TEST_CASES = [
  { name: "Attack on Titan", shouldFind: true },
  { name: "Demon Slayer", shouldFind: true },
  { name: "Steinsgate", shouldFind: true },
  { name: "Cowboy Bebop", shouldFind: true },
  { name: "Re:Zero", shouldFind: true },
  { name: "Demon Slayer Season 2", shouldFind: true },
  { name: "Neon Genesis Evangelion", shouldFind: true },
  { name: "Totally Fake Anime XXXYYY", shouldFind: false },
];

async function runTests() {
  console.log("🧪 Running streaming source tests...\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TEST_CASES) {
    try {
      const result = await findStreamingSource(test.name);
      const found = result !== null;
      
      if (found === test.shouldFind) {
        console.log(`✅ PASS: "${test.name}" - ${found ? `Found on ${result.source}` : 'Not found (as expected)'}`);
        passed++;
      } else {
        console.log(`❌ FAIL: "${test.name}" - ${found ? 'Found but expected not to' : 'Not found but expected to'}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: "${test.name}" - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${TEST_CASES.length}`);
  console.log(`Success rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%`);
  
  return failed === 0;
}

// Run tests
runTests().then(success => {
  if (success) console.log("✅ All tests passed!");
  else console.log("⚠️ Some tests failed");
});
```

**Run with:**
```bash
node --input-type=module test-streaming.js
```

---

## Expected Results

### Success Metrics
- ✅ Popular anime (top 100): 95%+ found
- ✅ Mainstream anime (top 1000): 85%+ found
- ✅ Less popular anime: 60%+ found
- ✅ Very obscure anime: 20-30% found (acceptable)

### Performance Metrics
- ✅ First search: <5 seconds
- ✅ Cached search: <100ms
- ✅ API latency: <2 seconds average
- ✅ CORS proxy latency: <3 seconds average

### Error Handling
- ✅ Network timeouts handled gracefully
- ✅ Provider failures don't crash app
- ✅ Meaningful error messages shown
- ✅ Fallback sources tried automatically

---

## Troubleshooting Failed Tests

### Issue: All tests failing
```javascript
// Check if services are loaded
console.log(typeof findStreamingSource); // Should be 'function'
console.log(typeof searchAnitaku);       // Should be 'function'
```

**Solution**: Restart the app, clear browser cache (Ctrl+Shift+Delete)

### Issue: Timeout errors
```javascript
// Increase timeout
// Edit animeApi.js and change:
// timeout = 12000  →  timeout = 20000
```

**Solution**: Slow network? Increase timeout values

### Issue: CORS errors
```
Cross-Origin Request Blocked: ...
```

**Solution**: CORS proxies might be down. Try again in a few minutes.

### Issue: Search returns empty results
```javascript
// This is expected for:
// - Brand new anime (not indexed yet)
// - Very obscure anime
// - Regional exclusive anime
```

**Solution**: This is normal. Only 80-85% success rate is achievable.

---

## Performance Optimization

If tests are slow, try these optimizations:

```javascript
// 1. Reduce timeout for faster failures
const TIMEOUT = 8000;  // Instead of 12000

// 2. Reduce number of CORS proxies
const CORS_PROXIES = [
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://yacdn.org/serve/",
];

// 3. Reduce title variants (try fewer combinations)
const titleVariants = (title) => [
  title,
  cleanTitle(title),
  title.split(":")[0].trim(),
];
```

---

## Success Checklist

After deploying the fix, verify:

- [ ] Browser console shows no errors
- [ ] "Watch Now" button works for popular anime
- [ ] Search completes in <5 seconds
- [ ] Cached searches are instant (<100ms)
- [ ] Error messages are helpful and clear
- [ ] Multiple anime can be searched without issues
- [ ] Cache persists across page refreshes
- [ ] New anime searches don't interfere with cached ones

---

**Status**: Ready for testing
**Expected Success Rate**: 85%+
**Estimated Completion**: Deploy fix and run 20-30 tests to validate
