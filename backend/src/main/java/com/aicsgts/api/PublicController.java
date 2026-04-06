package com.aicsgts.api;

import com.aicsgts.repo.DepartmentRepository;
import com.aicsgts.repo.JobRoleRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicController {

  private final DepartmentRepository departments;
  private final JobRoleRepository jobRoles;

  public PublicController(DepartmentRepository departments, JobRoleRepository jobRoles) {
    this.departments = departments;
    this.jobRoles = jobRoles;
  }

  @GetMapping("/registration-options")
  @Transactional(readOnly = true)
  public Map<String, Object> registrationOptions() {
    return Map.of(
        "departments", departments.findAll().stream().map(d -> Map.of(
            "id", d.getId(),
            "name", d.getName()
        )).toList(),
        "jobRoles", jobRoles.findAll().stream().map(r -> Map.of(
            "id", r.getId(),
            "name", r.getName()
        )).toList()
    );
  }
}

