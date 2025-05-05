package com.myorg.dota.controller;

import com.myorg.dota.dto.TeammateDto;
import com.myorg.dota.service.impl.TeammateService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/players")
public class TeammateController {

    private final TeammateService service;

    public TeammateController(TeammateService service) {
        this.service = service;
    }

    @GetMapping("/{accountId}/teammates")
    public List<TeammateDto> topTeammates(@PathVariable long accountId,
                                          @RequestParam(defaultValue = "10") int limit) {
        return service.findTopTeammates(accountId, limit);
    }
}
