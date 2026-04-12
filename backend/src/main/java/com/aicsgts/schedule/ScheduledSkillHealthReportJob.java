package com.aicsgts.schedule;

import com.aicsgts.domain.SystemConfig;
import com.aicsgts.repo.SystemConfigRepository;
import com.aicsgts.service.SkillHealthPptService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

/**
 * When enabled in system config, writes a PPTX under the JVM temp dir every Monday 08:00.
 * Wire SMTP in production to email the same bytes to {@link SystemConfig#getReportingRecipientEmail()}.
 */
@Component
public class ScheduledSkillHealthReportJob {

  private static final Logger log = LoggerFactory.getLogger(ScheduledSkillHealthReportJob.class);

  private final SystemConfigRepository configRepo;
  private final SkillHealthPptService pptService;

  public ScheduledSkillHealthReportJob(SystemConfigRepository configRepo, SkillHealthPptService pptService) {
    this.configRepo = configRepo;
    this.pptService = pptService;
  }

  @Scheduled(cron = "0 0 8 * * MON")
  public void generateWeeklyDeck() {
    try {
      SystemConfig sc = configRepo.findAll().stream().findFirst().orElse(null);
      if (sc == null || !sc.isScheduledReportingEnabled()) {
        return;
      }
      byte[] pptx = pptService.buildOrgSkillHealthDeck();
      Path dir = Path.of(System.getProperty("java.io.tmpdir"), "ai-csgts-scheduled-reports");
      Files.createDirectories(dir);
      Path out = dir.resolve("skill-health-" + Instant.now().toEpochMilli() + ".pptx");
      Files.write(out, pptx);
      log.info("Scheduled skill-health deck written to {}", out);
      if (sc.getReportingRecipientEmail() != null && !sc.getReportingRecipientEmail().isBlank()) {
        log.info("(Email not configured) intended recipient: {}", sc.getReportingRecipientEmail());
      }
    } catch (Exception e) {
      log.warn("Scheduled report failed", e);
    }
  }
}
