package com.aicsgts.repo;

import com.aicsgts.domain.EmployeeSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeSkillRepository extends JpaRepository<EmployeeSkill, Long> {
  @Query("select es from EmployeeSkill es where es.employee.id = :employeeId")
  List<EmployeeSkill> findByEmployeeId(@Param("employeeId") Long employeeId);

  @Query("select es from EmployeeSkill es where es.employee.id = :employeeId and es.skill.id = :skillId")
  Optional<EmployeeSkill> findByEmployeeIdAndSkillId(@Param("employeeId") Long employeeId, @Param("skillId") Long skillId);
}

