package com.myorg.dota.controller;

import com.myorg.dota.service.MatchRef;
import com.myorg.dota.service.SteamMatchIngestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class IngestController {

    private final SteamMatchIngestService ingest;

    public IngestController(SteamMatchIngestService ingest) {
        this.ingest = ingest;
    }

    @RequestMapping(
            value  = "/ingest/{accountId}",
            method = { RequestMethod.GET, RequestMethod.POST }
    )
    public ResponseEntity<?> ingestRecent(
            @PathVariable long accountId,
            @RequestParam(defaultValue = "200") int limit
    ) {
        List<MatchRef> refs = ingest.fetchRecentMatchRefs(accountId, limit);
        ingest.ingestMatchesBySeq(refs);
        return ResponseEntity.ok(Map.of(
                "inserted", refs.size(),
                "accountId", accountId,
                "type",     "recent"
        ));
    }

    @PostMapping("/ingest/full/{accountId}")
    public ResponseEntity<?> ingestFull(@PathVariable long accountId) {
        List<MatchRef> refs = ingest.fetchAllMatchRefs(accountId);
        ingest.ingestMatchesBySeq(refs);               // ⬅ вставляє «порціями» по 100
        return ResponseEntity.ok(Map.of(
                "inserted", refs.size(),
                "accountId", accountId,
                "type",     "full"
        ));
    }
}
