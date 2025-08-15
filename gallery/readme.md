# Gallery Dynamic Index System v2.1
## Technical Documentation


## Project Context
**Original**: Personal illustration site (neocities) with static HTML gallery  
**Problem**: Manual gallery.html edits, single-series scope, no cross-references  
**Migration Goal**: Dynamic JSON-based system with cross-series related works

## Development Timeline
```
Phase 1 [DONE]: Basic JSON system (fanart test, 10 works)
Phase 2 [DONE]: 4-category related works algorithm
Phase 3 [DONE]: External configuration (config.json)
Phase 4 [DONE]: Multi-series integration (5 series, 46 total works)
Phase 5 [DONE]: Diversity enhancement (randomization + balance)
Phase 6 [TODO]: Remaining page migration, tag generation
```

## Current State
- **Testing**: `/test/` directory with 2 converted pages
- **Data**: 5 JSON files (fanart:10, original:23, works:10, commission:1, groundpolis_paint:2)
- **System**: v2.1 with cross-series + diversity features
- **Status**: Core system complete, ready for full deployment

## Architecture Evolution
```
v1.0: Page → Single JSON → Fixed related works
v2.0: Page → Config + Multi JSON → Cross-series related works  
v2.1: Page → Config + Multi JSON → Cross-series + Diversity
```

## Architecture
```
Page → config.json → Multi-series JSON parallel load → 
Related work calculation (diversity) → Dynamic render
```

## File Structure
```
/test/
├── data/
│   ├── config.json
│   ├── fanart.json (10), original.json (23), works.json (10)
│   ├── commission.json (1), groundpolis_paint.json (2)
├── gallery-system.js v2.1
└── gallery/*.html
```

## Data Schema
```json
// config.json
{
  "series": {"fanart": {"dataPath": "data/fanart.json"}},
  "diversity": {"randomize": true, "seriesBalance": true, "maxSameSeriesRatio": 0.6}
}

// series JSON
{"fanart_series": [{"id": "work_id", "series": "fanart", "tags": [...]}]}
```

## Algorithm
1. **Cross-series data load**: Promise.allSettled, 5 JSON files
2. **Related calculation**: same-series → same-period → common-tags (frequency-based)
3. **Diversity enhancement**: Fisher-Yates shuffle + series balance (max 60% same series)

## Key Classes
```javascript
GalleryConfig: loadConfig(), get(path)
MultiSeriesDataManager: loadAllSeriesData(), flattenAllData()  
SimpleDiversityEnhancer: shuffleArray(), balanceSeriesDistribution()
RelatedWorksManager: getRelatedWorks(), renderContent()
```

## Implementation Status ✅
**Core System**: Multi-series cross-reference, external config, diversity enhancement  
**Test Environment**: `/test/` with 2 pages (fanart_sameji-chan.html, fanart_remilia2.html)  
**Performance Verified**: 3.6ms load, 0.03ms config access, 85MB memory  
**Production Ready**: System stable, needs page migration

## Current Workflow
1. **New Work**: Add to appropriate series JSON
2. **Page Creation**: Copy template, update GalleryPageConfig  
3. **System**: Auto-calculates cross-series related works with diversity

## Migration Progress
```
Total Pages: ~73 (5 series pages + 68 individual)
Converted: 2 individual pages 
Status: Ready for bulk migration
```

## Page Setup
```html
<script src="../gallery-system.js"></script>
<script>
window.GalleryPageConfig = {
  currentSeries: 'fanart',
  currentId: 'fanart_work_id',
  debug: false
};
</script>
```

## Configuration
```json
"diversity": {
  "randomize": true/false,
  "seriesBalance": true/false, 
  "maxSameSeriesRatio": 0.6  // 60% max same series
}
```

## Debug Commands
```javascript
multiSeriesDataManager.getSeriesCounts()  // {fanart: 10, original: 23, ...}
simpleDiversityEnhancer.config
runAllTests()
```

## Performance Metrics
- Config load: 3.6ms
- 100x config access: 0.03ms
- Memory: 85MB/4096MB
- Multi-series load: 5 files parallel

## Remaining Tasks
- [ ] Individual page migration
- [ ] Tag page auto-generation
- [ ] Search foundation

## Technical Constraints
- Static hosting (Neocities)
- ES6+ browsers required
- Manual JSON creation (temporary)
- SEO considerations for dynamic content